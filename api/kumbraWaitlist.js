import nodemailer from "nodemailer";

// Kumbra waiting list (www.axclimb.com/kumbra). Each sign-up is saved in Supabase (join_waitlist,
// which also keeps the @ for that email; only callable with the service-role key, set in Vercel as
// SUPABASE_SERVICE_ROLE_KEY) and emailed to axclimb@gmail.com (with who invited them); the person
// gets a welcome email. Without the key or the migration, the @ is only checked against the app's
// accounts, as before.

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPABASE_URL = "https://raaokvljxioaxaoqcjxa.supabase.co";
const SUPABASE_KEY = "sb_publishable_TFiQYiyqkaHv9mEvGR2rgw_hG7sHMU9";

/// "ok" | "exists" | "taken" | "invalid", or null when the list isn't in Supabase yet (or is down).
async function joinWaitlist(email, username, ref) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/join_waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_email: email, p_username: username, p_ref: ref, p_avatar: "" }),
    });
    if (!response.ok) {
      console.error("join_waitlist", response.status, await response.text().catch(() => ""));
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("join_waitlist", error);
    return null;
  }
}

async function isUsernameFree(username) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_username_available`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ p_username: username }),
    });
    // If the check itself fails, the sign-up still goes through and is reviewed by hand.
    return response.ok ? await response.json() : true;
  } catch {
    return true;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method" });
  }

  const body = req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const username = String(body.username || "").trim().toLowerCase();
  const ref = String(body.ref || "").toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20);

  // Hidden field only bots fill in: answer as if it worked and drop it.
  if (body.website) return res.status(200).json({ ok: true });
  if (!EMAIL_RE.test(email) || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: "invalid" });
  }
  const saved = await joinWaitlist(email, username, ref);
  if (saved === "taken" || saved === "exists") return res.status(409).json({ error: saved });
  if (saved === "invalid") return res.status(400).json({ error: "invalid" });
  if (saved === null && !(await isUsernameFree(username))) {
    return res.status(409).json({ error: "taken" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  try {
    const teamMail = {
      to: "axclimb@gmail.com",
      replyTo: email,
      subject: `Kumbra lista de espera: @${username}`,
      text: [
        `Email: ${email}`,
        `Usuario: @${username}`,
        `Invitado por: ${ref ? "@" + ref : "(nadie)"}`,
        `Guardado en Supabase: ${saved === "ok" ? "sí" : "no (apúntalo a mano)"}`,
        `Fecha: ${new Date().toISOString()}`,
      ].join("\n"),
    };
    // Through Resend when it's set up (no Gmail password needed); otherwise Gmail as before.
    if (process.env.RESEND_API_KEY) await sendWithResend(teamMail);
    else await transporter.sendMail({ from: process.env.EMAIL_USER, ...teamMail });
  } catch (error) {
    console.error("kumbraWaitlist team email failed:", error && error.message);
    // Already saved in Supabase: the sign-up counts even if our copy didn't go.
    if (saved !== "ok") return res.status(500).json({ error: "server" });
  }

  // The welcome email is a courtesy: if it fails, the sign-up is already recorded above.
  let welcome = true;
  try {
    const link = `https://www.axclimb.com/kumbra?ref=${encodeURIComponent(username)}`;
    const welcomeMail = {
      to: email,
      subject: `@${username}, ya eres Fundador de Kumbra`,
      text: welcomeText(username, email, link),
      html: welcomeHtml(username, email, link),
    };
    // With RESEND_API_KEY in Vercel it goes out from our own domain (axclimb.com, verified in Resend
    // with SPF/DKIM), so it lands in the inbox instead of spam. Without it, Gmail as before.
    if (process.env.RESEND_API_KEY) await sendWithResend(welcomeMail);
    else await transporter.sendMail({ from: `Kumbra <${process.env.EMAIL_USER}>`, ...welcomeMail });
  } catch (error) {
    welcome = false;
    console.error("kumbraWaitlist welcome email failed:", error && error.message);
  }

  return res.status(200).json({ ok: true, welcome });
}

const RESEND_FROM = process.env.RESEND_FROM || "Kumbra <hola@axclimb.com>";

async function sendWithResend({ to, subject, text, html, replyTo }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], reply_to: replyTo || "axclimb@gmail.com", subject, text, ...(html ? { html } : {}) }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

const PACK = [
  ["Tu @, antes que nadie", "Nadie más podrá usarlo."],
  ["Insignia Fundador", "Junto a tu nombre en el feed, tu perfil y el ranking."],
  ["Fondo de perfil «Cumbre»", "La montaña de noche como cabecera de tu perfil."],
  ["Precio Fundador en Pro", "19,99 € tu primer año."],
  ["Y detalles solo para fundadores", "Icono secreto, paleta Atardecer, avatares y logro Fundador."],
];

function welcomeText(username, email, link) {
  return [
    `Ya estás dentro, @${username}.`,
    ``,
    `Hemos reservado @${username} para ti. Cuando abramos Kumbra te avisaremos antes que a nadie. Ese día, crea tu cuenta en la app con este mismo email (${email}) y @${username} será tuyo.`,
    ``,
    `Tu Pack Fundador:`,
    ...PACK.map(([title, detail]) => `- ${title}: ${detail}`),
    ``,
    `Trae a 3 amigos con tu enlace y descubre la recompensa que solo tiene quien invita:`,
    link,
    ``,
    `Si no te has apuntado tú o quieres salir de la lista, responde a este email y te borramos.`,
    ``,
    `Kumbra · Hecho en Madrid`,
  ].join("\n");
}

const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Table layout and inline styles: what email clients (Gmail, Outlook, Apple Mail) render reliably.
function welcomeHtml(username, email, link) {
  const handle = `@${username}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`Me he apuntado a Kumbra, la red social de escalada, que está a punto de salir. Si reservas tu nombre con mi enlace entras con el Pack Fundador: ${link}`)}`;
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const rows = PACK.map(([title, detail]) => `
              <tr>
                <td width="22" valign="top" style="padding:7px 0;font:700 15px ${font};color:#F2B44A;">▲</td>
                <td style="padding:7px 0;font:400 14px/1.4 ${font};color:#C9BFD3;"><b style="color:#F5EFE6;font-weight:700;">${title}</b><br>${detail}</td>
              </tr>`).join("");
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>Ya eres Fundador de Kumbra</title>
<style>u + .body .gs { background: #000; mix-blend-mode: screen; } u + .body .gd { background: #000; mix-blend-mode: difference; }</style></head>
<body class="body" bgcolor="#0E0B16" style="margin:0;padding:0;background-color:#0E0B16;background-image:linear-gradient(#0E0B16,#0E0B16);">
  <div style="display:none;max-height:0;overflow:hidden;">Hemos reservado ${handle} para ti. Este es tu Pack Fundador.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0E0B16" style="background-color:#0E0B16;background-image:linear-gradient(#0E0B16,#0E0B16);">
    <tr><td align="center" bgcolor="#0E0B16" style="padding:24px 12px;background-color:#0E0B16;background-image:linear-gradient(#0E0B16,#0E0B16);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1A1324" style="max-width:560px;background-color:#1A1324;background-image:linear-gradient(#1A1324,#1A1324);border-radius:24px;overflow:hidden;">
        <tr><td><img src="https://www.axclimb.com/kumbra/mail.jpg" width="560" alt="Kumbra" style="display:block;width:100%;height:auto;border:0;"></td></tr>
        <tr><td bgcolor="#1A1324" style="padding:28px 28px 8px;background-color:#1A1324;background-image:linear-gradient(#1A1324,#1A1324);">
          <span style="display:inline-block;padding:5px 11px;border-radius:99px;background-color:#E8B53A;background-image:linear-gradient(#E8B53A,#E8B53A);color:#3A2108;font:800 11px ${font};letter-spacing:1px;">▲ FUNDADOR</span>
          <div class="gs"><div class="gd"><h1 style="margin:16px 0 8px;font:900 30px/1.1 ${font};letter-spacing:-0.5px;color:#F5EFE6;">Ya estás dentro, ${handle}.</h1>
          <p style="margin:0;font:400 15px/1.55 ${font};color:#C9BFD3;">Hemos reservado <b style="color:#F5EFE6;">${handle}</b> para ti. Cuando abramos Kumbra te avisaremos antes que a nadie. Ese día, crea tu cuenta en la app con este mismo email (<b style="color:#F5EFE6;">${esc(email)}</b>) y será tuyo.</p></div></div>
        </td></tr>
        <tr><td bgcolor="#1A1324" style="padding:20px 28px 4px;background-color:#1A1324;background-image:linear-gradient(#1A1324,#1A1324);">
          <div class="gs"><div class="gd"><p style="margin:0 0 6px;font:700 11px ${font};letter-spacing:2px;color:#F2B44A;">TU PACK FUNDADOR</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
          </table></div></div>
        </td></tr>
        <tr><td bgcolor="#1A1324" style="padding:18px 28px 6px;background-color:#1A1324;background-image:linear-gradient(#1A1324,#1A1324);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #6B5530;border-radius:18px;">
            <tr><td style="padding:18px;">
              <div class="gs"><div class="gd"><p style="margin:0 0 4px;font:800 16px ${font};color:#F5EFE6;">? &nbsp;Trae a 3 amigos</p>
              <p style="margin:0 0 14px;font:400 14px/1.5 ${font};color:#C9BFD3;">Cuando 3 amigos reserven su nombre con tu enlace y creen su cuenta, desbloquearás la recompensa que solo tiene quien invita.</p>
              <p style="margin:0 0 14px;font:500 13px ${font};color:#F2B44A;word-break:break-all;">${link.replace("https://", "")}</p></div></div>
              <a href="${wa}" style="display:inline-block;padding:12px 18px;border-radius:12px;background-color:#25D366;background-image:linear-gradient(#25D366,#25D366);color:#08210F;font:800 14px ${font};text-decoration:none;">Compartir por WhatsApp</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td bgcolor="#1A1324" style="padding:22px 28px 28px;background-color:#1A1324;background-image:linear-gradient(#1A1324,#1A1324);">
          <div class="gs"><div class="gd"><p style="margin:0;font:400 12px/1.6 ${font};color:#8C8197;">Si no te has apuntado tú o quieres salir de la lista, responde a este email y te borramos. <a href="https://www.axclimb.com/kumbra-privacy#lista-de-espera" style="color:#C9BFD3;">Privacidad</a></p>
          <p style="margin:10px 0 0;font:700 12px ${font};color:#8C8197;">Kumbra · Hecho en Madrid</p></div></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
