// Kumbra waiting list: a daily summary to axclimb@gmail.com with everyone who joined in the last 24 h
// (time, @, email, climbing gym, who invited them) and the running total. Sent by a Vercel cron
// (vercel.json, 21:00 UTC = 22:00 in Madrid in winter, 23:00 in summer), also when nobody joined, so
// it's clear it works. If a ntfy notice or a sign-up email gets lost, the list is here every day.
//
// Needs in Vercel: SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY (already there). Optional CRON_SECRET:
// when set, Vercel sends it and only that call is accepted.

const SUPABASE_URL = "https://raaokvljxioaxaoqcjxa.supabase.co";
const RESEND_FROM = process.env.RESEND_FROM || "Kumbra <hola@axclimb.com>";

function isCron(req) {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.authorization === `Bearer ${secret}`;
  return String(req.headers["user-agent"] || "").startsWith("vercel-cron");
}

async function supabase(path, key, extraHeaders = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...extraHeaders },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r;
}

const madridTime = (iso) =>
  new Date(iso).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
const madridDay = (date) =>
  date.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" });
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/// { visits, ios, android, other, bySrc: { src: visits } }; ios/android/other count jumps to a store.
function qrSummary(events) {
  const out = { visits: 0, ios: 0, android: 0, other: 0, bySrc: {} };
  for (const e of events) {
    if (e.kind === "visit") {
      out.visits++;
      out.bySrc[e.src] = (out.bySrc[e.src] || 0) + 1;
    } else if (e.kind === "store") out[e.platform] = (out[e.platform] || 0) + 1;
  }
  return out;
}

const qrText = (label, s) => {
  const srcs = Object.entries(s.bySrc).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(", ");
  return `${label}: ${s.visits} visitas, ${s.ios + s.android + s.other} a la tienda (iOS ${s.ios}, Android ${s.android})${srcs ? ` · por origen: ${srcs}` : ""}`;
};

export default async function handler(req, res) {
  if (!isCron(req)) return res.status(401).json({ error: "unauthorized" });
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !process.env.RESEND_API_KEY) return res.status(500).json({ error: "server" });

  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const rows = await (await supabase(
      `waitlist?select=created_at,username,email,rocodromo,ref,user_id&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc`,
      key,
    )).json();
    const totalRange = (await supabase("waitlist?select=id&limit=1", key, { Prefer: "count=exact" })).headers.get("content-range") || "";
    const total = Number(totalRange.split("/")[1]) || 0;

    // QR landing (/kumbra/join?src=...): visits and jumps to a store, last 24 h and all time.
    let qr = null;
    try {
      const recent = await (await supabase(
        `qr_events?select=src,kind,platform&created_at=gte.${encodeURIComponent(since)}&limit=10000`, key)).json();
      const count = async (filter) => Number(((await supabase(`qr_events?select=id&limit=1&${filter}`, key,
        { Prefer: "count=exact" })).headers.get("content-range") || "").split("/")[1]) || 0;
      const [visits, ios, android, other] = await Promise.all([
        count("kind=eq.visit"), count("kind=eq.store&platform=eq.ios"),
        count("kind=eq.store&platform=eq.android"), count("kind=eq.store&platform=eq.other"),
      ]);
      qr = { day: qrSummary(recent), total: { visits, ios, android, other, bySrc: {} } };
    } catch (error) {
      console.error("kumbraDigest qr", error && error.message);
    }

    const day = madridDay(new Date());
    const n = rows.length;
    const subject = n === 0
      ? `Kumbra lista de espera · ${day}: nadie nuevo (${total} en total)`
      : `Kumbra lista de espera · ${day}: ${n} ${n === 1 ? "nuevo" : "nuevos"} (${total} en total)`;

    const line = (w) => [
      madridTime(w.created_at),
      `@${w.username}`,
      w.email,
      w.rocodromo ? `Rocódromo: ${w.rocodromo}` : "Sin rocódromo",
      w.ref ? `Invitado por @${w.ref}` : null,
    ].filter(Boolean).join(" · ");
    const text = [
      n === 0 ? "Hoy no se ha apuntado nadie a la lista de espera." : `Se han apuntado ${n} en las últimas 24 horas:`,
      "",
      ...rows.map(line),
      "",
      `Total en la lista: ${total}`,
      ...(qr ? ["", "QR de descarga (/kumbra/join):", qrText("Últimas 24 h", qr.day), qrText("Total", qr.total)] : []),
    ].join("\n");

    const cell = "padding:6px 10px;border-bottom:1px solid #eee;font:14px -apple-system,Segoe UI,Roboto,Arial,sans-serif;";
    const html = `<!doctype html><html lang="es"><body style="margin:0;padding:16px;font:14px -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#222;">
<p style="margin:0 0 12px;">${n === 0 ? "Hoy no se ha apuntado nadie a la lista de espera." : `Se han apuntado <b>${n}</b> en las últimas 24 horas:`}</p>
${n === 0 ? "" : `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr>${["Hora", "@", "Email", "Rocódromo", "Invitado por"].map((h) => `<th align="left" style="${cell}color:#666;font-weight:600;">${h}</th>`).join("")}</tr>
${rows.map((w) => `<tr><td style="${cell}">${madridTime(w.created_at)}</td><td style="${cell}"><b>@${escapeHtml(w.username)}</b></td><td style="${cell}">${escapeHtml(w.email)}</td><td style="${cell}">${escapeHtml(w.rocodromo || "—")}</td><td style="${cell}">${w.ref ? "@" + escapeHtml(w.ref) : ""}</td></tr>`).join("\n")}
</table>`}
<p style="margin:16px 0 0;">Total en la lista: <b>${total}</b></p>
${qr ? `<p style="margin:20px 0 6px;"><b>QR de descarga</b> (/kumbra/join)</p>
<p style="margin:0;">${escapeHtml(qrText("Últimas 24 h", qr.day))}<br>${escapeHtml(qrText("Total", qr.total))}</p>` : ""}
</body></html>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: RESEND_FROM, to: ["axclimb@gmail.com"], subject, text, html }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return res.status(200).json({ ok: true, joined: n, total });
  } catch (error) {
    console.error("kumbraDigest", error && error.message);
    return res.status(500).json({ error: "server" });
  }
}
