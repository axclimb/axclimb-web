// Launch-day emails for the waiting list (same look as the welcome email in api/kumbraWaitlist.js): the
// launch one, the reminder three days later, and a version for whoever already brought 3 friends. Not a route
// (the leading underscore): used by api/kumbraLaunch.js.
const APP_STORE = "https://apps.apple.com/app/id6818507035";
const GOOGLE_PLAY = "https://play.google.com/store/apps/details?id=com.axclimb.kumbra";
const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const card = "background-color:#1A1324;background-image:linear-gradient(#1A1324,#1A1324);";
const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STEPS = (email) => [
  ["Descarga Kumbra", "En la App Store o en Google Play."],
  ["Crea tu cuenta con este email", email],
  ["Tu @ y tu Pack Fundador ya están", "Insignia, fondo Cumbre, los detalles de fundador y 19,99 € tu primer año de Pro."],
];

export function launchSubject(username, reminder) {
  return reminder ? `@${username}, tu @ sigue esperándote en Kumbra` : `@${username}, Kumbra ya está aquí`;
}

export function launchText(username, email, reminder, friendsDone = null) {
  const invite = `https://www.axclimb.com/u/${encodeURIComponent(username)}`;
  return [
    reminder ? `@${username}, tu @ sigue esperándote.` : `Kumbra ya está aquí, @${username}.`,
    ``,
    reminder
      ? `Kumbra salió el lunes y @${username} sigue reservado para ti. Crea tu cuenta con este mismo email (${email}) y entras con tu @ y el Pack Fundador.`
      : `La espera ha terminado. @${username} sigue reservado para ti: crea tu cuenta con este mismo email (${email}) y entras con tu @ y el Pack Fundador ya puesto.`,
    ``,
    `App Store: ${APP_STORE}`,
    `Google Play: ${GOOGLE_PLAY}`,
    ``,
    ...STEPS(email).map(([t, d], i) => `${i + 1}. ${t}: ${d}`),
    ``,
    friendsDone
      ? `Ya tienes a tus 3 amigos: tu recompensa es el Aro dorado. ${friendsDone === "on" ? "Ya lo tienes en la app" : "Se activa en cuanto tus 3 amigos creen su cuenta (avísales hoy)"}; ponlo en Perfil, tocando tu avatar y eligiendo «Aro dorado».`
      : `Trae a 3 amigos con tu enlace y desbloquea la recompensa que solo tiene quien invita: ${invite}`,
    ``,
    `Si ya no quieres recibir nada de Kumbra, responde a este email y te borramos de la lista.`,
    ``,
    `Kumbra · Hecho en Madrid`,
  ].join("\n");
}

// The web's own store buttons as images (email clients drop SVG), 3x for sharp screens.
const storeButton = (href, img, alt, width) => `<a href="${href}" style="display:inline-block;margin:0 8px 10px 0;text-decoration:none;"><img src="https://www.axclimb.com/kumbra/${img}" width="${width}" height="44" alt="${alt}" style="display:block;width:${width}px;height:44px;border:0;"></a>`;


const inviteBlock = (invite, wa) => `        <tr><td bgcolor="#1A1324" style="padding:18px 28px 6px;${card}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #6B5530;border-radius:18px;">
            <tr><td style="padding:18px;">
              <div class="gs"><div class="gd"><p style="margin:0 0 4px;font:800 16px ${font};color:#F5EFE6;">? &nbsp;Trae a 3 amigos</p>
              <p style="margin:0 0 14px;font:400 14px/1.5 ${font};color:#C9BFD3;">Cuando 3 amigos creen su cuenta con tu enlace, desbloquearás la recompensa que solo tiene quien invita.</p>
              <p style="margin:0 0 14px;font:500 13px ${font};color:#F2B44A;word-break:break-all;">${invite.replace("https://", "")}</p></div></div>
              <a href="${wa}" style="display:inline-block;padding:12px 18px;border-radius:12px;background-color:#25D366;background-image:linear-gradient(#25D366,#25D366);color:#08210F;font:800 14px ${font};text-decoration:none;">Compartir por WhatsApp</a>
            </td></tr>
          </table>
        </td></tr>
`;

// For whoever already brought 3 friends: their reward instead of the invite (still a surprise for the rest).
const ringBlock = (ringOn, initial) => `
        <tr><td bgcolor="#1A1324" style="padding:18px 28px 6px;${card}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #6B5530;border-radius:18px;">
            <tr><td style="padding:18px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td width="56" height="56" align="center" valign="middle" background="https://www.axclimb.com/kumbra/aro-dorado.png" bgcolor="#E8B53A" style="width:56px;height:56px;border-radius:28px;background-image:url('https://www.axclimb.com/kumbra/aro-dorado.png');background-size:56px 56px;background-position:center;font:900 22px ${font};color:#F5EFE6;">${initial}</td>
                <td style="padding-left:14px;"><div class="gs"><div class="gd"><p style="margin:0;font:800 16px ${font};color:#F5EFE6;">Ya tienes a tus 3 amigos</p>
                <p style="margin:2px 0 0;font:600 13px ${font};color:#F2B44A;">Tu recompensa: el Aro dorado</p></div></div></td>
              </tr></table>
              <div class="gs"><div class="gd"><p style="margin:14px 0 0;font:400 14px/1.5 ${font};color:#C9BFD3;">${ringOn
                ? "Ya lo tienes en la app. Ve a Perfil, toca tu avatar y elige <b style=\"color:#F5EFE6;\">Aro dorado</b>."
                : "Se activa en cuanto tus 3 amigos creen su cuenta: avísales hoy. Cuando lo tengas, ve a Perfil, toca tu avatar y elige <b style=\"color:#F5EFE6;\">Aro dorado</b>."}</p></div></div>
            </td></tr>
          </table>
        </td></tr>
`;

/// friendsDone: null for most; "on" / "pending" for whoever already brought 3 friends (ring on or waiting).
export function launchHtml(username, email, reminder, friendsDone = null) {
  const handle = `@${username}`;
  const invite = `https://www.axclimb.com/u/${encodeURIComponent(username)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`Ya ha salido Kumbra, la red social de escalada. Si te la bajas con mi enlace me ayudas a conseguir mi recompensa: ${invite}`)}`;
  const title = reminder ? `${handle}, tu @ sigue esperándote.` : `Kumbra ya está aquí, ${handle}.`;
  const intro = reminder
    ? `Kumbra salió el lunes y <b style="color:#F5EFE6;">${handle}</b> sigue reservado para ti. Crea tu cuenta con este mismo email y entras con tu @ y el Pack Fundador.`
    : `La espera ha terminado. <b style="color:#F5EFE6;">${handle}</b> sigue reservado para ti: crea tu cuenta con este mismo email y entras con tu @ y el Pack Fundador ya puesto.`;
  const steps = STEPS(email).map(([t, d], i) => `
              <tr>
                <td width="34" valign="top" style="padding:8px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="24" height="24" align="center" valign="middle" bgcolor="#2B2138" style="width:24px;height:24px;border-radius:12px;background-color:#2B2138;background-image:linear-gradient(#2B2138,#2B2138);font:800 12px/24px ${font};color:#F2B44A;text-align:center;mso-line-height-rule:exactly;">${i + 1}</td></tr></table>
                </td>
                <td style="padding:8px 0;font:400 14px/1.4 ${font};color:#C9BFD3;"><b style="color:#F5EFE6;font-weight:700;">${t}</b><br>${esc(d)}</td>
              </tr>`).join("");
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(title)}</title>
<style>u + .body .gs { background: #000; mix-blend-mode: screen; } u + .body .gd { background: #000; mix-blend-mode: difference; }</style></head>
<body class="body" bgcolor="#0E0B16" style="margin:0;padding:0;background-color:#0E0B16;background-image:linear-gradient(#0E0B16,#0E0B16);">
  <div style="display:none;max-height:0;overflow:hidden;">${reminder ? "Entra con este email y es tuyo." : `Descárgala y entra con este email: ${handle} es tuyo.`}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0E0B16" style="background-color:#0E0B16;background-image:linear-gradient(#0E0B16,#0E0B16);">
    <tr><td align="center" bgcolor="#0E0B16" style="padding:24px 12px;background-color:#0E0B16;background-image:linear-gradient(#0E0B16,#0E0B16);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1A1324" style="max-width:560px;${card}border-radius:24px;overflow:hidden;">
        <tr><td><img src="https://www.axclimb.com/kumbra/mail.jpg" width="560" alt="Kumbra" style="display:block;width:100%;height:auto;border:0;"></td></tr>
        <tr><td bgcolor="#1A1324" style="padding:28px 28px 8px;${card}">
          <span style="display:inline-block;padding:5px 11px;border-radius:99px;background-color:#E8B53A;background-image:linear-gradient(#E8B53A,#E8B53A);color:#3A2108;font:800 11px ${font};letter-spacing:1px;">▲ FUNDADOR</span>
          <div class="gs"><div class="gd"><h1 style="margin:16px 0 8px;font:900 30px/1.1 ${font};letter-spacing:-0.5px;color:#F5EFE6;">${title}</h1>
          <p style="margin:0 0 18px;font:400 15px/1.55 ${font};color:#C9BFD3;">${intro}</p></div></div>
          ${storeButton(APP_STORE, "app-store.png", "Descárgala en la App Store", 149)}${storeButton(GOOGLE_PLAY, "google-play.png", "Disponible en Google Play", 137)}
        </td></tr>
        <tr><td bgcolor="#1A1324" style="padding:14px 28px 4px;${card}">
          <div class="gs"><div class="gd"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps}
          </table></div></div>
        </td></tr>
${friendsDone ? ringBlock(friendsDone === "on", esc(username.replace(/[^a-z0-9]/gi, "").charAt(0).toUpperCase() || "K")) : inviteBlock(invite, wa)}
        <tr><td bgcolor="#1A1324" style="padding:22px 28px 28px;${card}">
          <div class="gs"><div class="gd"><p style="margin:0;font:400 12px/1.6 ${font};color:#8C8197;">Te escribimos porque reservaste ${handle} en la lista de espera de Kumbra. Si ya no quieres recibir nada, responde a este email y te borramos. <a href="https://www.axclimb.com/kumbra-privacy#lista-de-espera" style="color:#C9BFD3;">Privacidad</a></p>
          <p style="margin:10px 0 0;font:700 12px ${font};color:#8C8197;">Kumbra · Hecho en Madrid</p></div></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
