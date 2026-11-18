// Kumbra QR landing (www.axclimb.com/kumbra/join?src=...): the page sends a beacon on each visit
// ("visit" = someone scanned / opened it) and when it jumps to a store ("store"). Saved in Supabase
// (public.qr_events, applied 2026-11-18; SQL in supabase/qr_events.sql) with the service-role key.
// Anonymous: no IP, no cookies, no identifier, only time, src, kind and ios/android/other.
// The daily summary (api/kumbraDigest.js) counts them.

const SUPABASE_URL = "https://raaokvljxioaxaoqcjxa.supabase.co";
const SRC_RE = /^[a-z0-9_-]{1,40}$/;
const KINDS = new Set(["visit", "store"]);
const PLATFORMS = new Set(["ios", "android", "other"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });

  // sendBeacon posts text/plain, so the body may arrive as a string.
  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const src = String(body.src || "").toLowerCase();
  const kind = String(body.kind || "");
  const platform = String(body.platform || "");
  if (!SRC_RE.test(src) || !KINDS.has(kind) || !PLATFORMS.has(platform)) {
    return res.status(400).json({ error: "invalid" });
  }
  // Link previews (WhatsApp, iMessage...) don't run JS, but skip obvious bots anyway.
  if (/bot|crawler|spider|preview/i.test(String(req.headers["user-agent"] || ""))) {
    return res.status(204).end();
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return res.status(500).json({ error: "server" });
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/qr_events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`, Prefer: "return=minimal" },
      body: JSON.stringify({ src, kind, platform }),
    });
    if (!r.ok) {
      console.error("qr_events", r.status, await r.text().catch(() => ""));
      return res.status(500).json({ error: "server" });
    }
    return res.status(204).end();
  } catch (error) {
    console.error("qr_events", error && error.message);
    return res.status(500).json({ error: "server" });
  }
}
