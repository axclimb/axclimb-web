import { launchHtml, launchSubject, launchText } from "./_kumbraLaunchMail.js";

// Kumbra launch emails to the waiting list: on 16 Nov the launch one, on 19 Nov the reminder, both to whoever
// hasn't made their account yet (waitlist.user_id still empty). A daily Vercel cron calls this in the morning
// (vercel.json); on any other day it does nothing. Each email is handed to Resend scheduled for 12:00 in Madrid,
// so it arrives at that time even though the cron itself only runs within the hour. launch_sent_at /
// reminder_sent_at mark who already has it, so nobody gets one twice.
//
// Needs in Vercel: SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY (already there). Optional CRON_SECRET, as in
// kumbraDigest.

const SUPABASE_URL = "https://raaokvljxioaxaoqcjxa.supabase.co";
const RESEND_FROM = process.env.RESEND_FROM || "Kumbra <hola@axclimb.com>";
const SENDS = {
  "2026-11-16": { kind: "launch", column: "launch_sent_at", at: "2026-11-16T11:00:00.000Z" },
  "2026-11-19": { kind: "reminder", column: "reminder_sent_at", at: "2026-11-19T11:00:00.000Z" },
};
// Brought 3 "friends" that were variants of their own email (1 Nov): no Aro dorado, so the usual email.
const NO_RING = new Set(["apb2210"]);

function isCron(req) {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.authorization === `Bearer ${secret}`;
  return String(req.headers["user-agent"] || "").startsWith("vercel-cron");
}

const madridDate = (d) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function supabase(path, key, init = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r;
}

async function resend(body) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

/** Who gets this one: no account yet and not sent; the reminder only to those who already had the launch email. */
function pendingQuery(kind) {
  const base = "waitlist?select=id,username,email,reward_sent_at&user_id=is.null&order=created_at.asc";
  return kind === "launch" ? `${base}&launch_sent_at=is.null` : `${base}&launch_sent_at=not.is.null&reminder_sent_at=is.null`;
}

/** The email for one person; whoever already brought 3 friends gets the Aro dorado block instead of the invite. */
export function emailFor(row, kind) {
  const reminder = kind === "reminder";
  const friendsDone = row.reward_sent_at && !NO_RING.has(row.username) ? "pending" : null;
  return {
    from: RESEND_FROM,
    to: [row.email],
    reply_to: "axclimb@gmail.com",
    subject: launchSubject(row.username, reminder),
    text: launchText(row.username, row.email, reminder, friendsDone),
    html: launchHtml(row.username, row.email, reminder, friendsDone),
    headers: { "List-Unsubscribe": "<mailto:axclimb@gmail.com?subject=Baja%20de%20Kumbra>" },
  };
}

export default async function handler(req, res) {
  if (!isCron(req)) return res.status(401).json({ error: "unauthorized" });
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !process.env.RESEND_API_KEY) return res.status(500).json({ error: "server" });
  const send = SENDS[madridDate(new Date())];
  if (!send) return res.status(200).json({ ok: true, skipped: true });

  const sent = [];
  const failed = [];
  try {
    const rows = await (await supabase(pendingQuery(send.kind), key)).json();
    // Already past 12:00 (a late cron): send now rather than schedule in the past.
    const at = Date.now() < Date.parse(send.at) ? send.at : undefined;
    for (const row of rows) {
      try {
        await resend({ ...emailFor(row, send.kind), ...(at ? { scheduled_at: at } : {}) });
        await supabase(`waitlist?id=eq.${row.id}`, key, { method: "PATCH", body: JSON.stringify({ [send.column]: new Date().toISOString() }) });
        sent.push(row.username);
      } catch (error) {
        failed.push(row.username);
        console.error("kumbraLaunch", row.username, error && error.message);
      }
      await sleep(600); // Resend allows 2 requests a second.
    }
    await resend({
      from: RESEND_FROM,
      to: ["axclimb@gmail.com"],
      subject: `Kumbra: correo de ${send.kind === "launch" ? "lanzamiento" : "recordatorio"} programado para ${sent.length}`,
      text: [
        `Programado para las 12:00: ${sent.length}.`,
        sent.length ? sent.map((n) => "@" + n).join(", ") : "",
        failed.length ? `\nNo se han podido programar (${failed.length}): ${failed.map((n) => "@" + n).join(", ")}. Mira los logs de Vercel.` : "",
      ].join("\n"),
    }).catch((error) => console.error("kumbraLaunch summary", error && error.message));
    return res.status(200).json({ ok: true, kind: send.kind, sent: sent.length, failed: failed.length });
  } catch (error) {
    console.error("kumbraLaunch", error && error.message);
    return res.status(500).json({ error: "server", sent: sent.length });
  }
}
