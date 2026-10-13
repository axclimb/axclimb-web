// Kumbra waiting list: where the person climbs ("¿Dónde escalas?", optional, after joining). Saved on
// their sign-up only when the email and the @ match one row; written with the service-role key (the
// table has RLS and no public writes).
const SUPABASE_URL = "https://raaokvljxioaxaoqcjxa.supabase.co";
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const body = req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const username = String(body.username || "").trim().toLowerCase();
  const gym = String(body.gym || "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!EMAIL_RE.test(email) || !USERNAME_RE.test(username) || !gym) return res.status(400).json({ error: "invalid" });
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return res.status(500).json({ error: "server" });
  try {
    const url = `${SUPABASE_URL}/rest/v1/waitlist?email=eq.${encodeURIComponent(email)}&username=eq.${encodeURIComponent(username)}`;
    const r = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`, Prefer: "return=representation" },
      body: JSON.stringify({ rocodromo: gym }),
    });
    if (!r.ok) {
      console.error("kumbraGym", r.status, await r.text().catch(() => ""));
      return res.status(500).json({ error: "server" });
    }
    const rows = await r.json().catch(() => []);
    return res.status(200).json({ ok: rows.length > 0 });
  } catch (error) {
    console.error("kumbraGym", error && error.message);
    return res.status(500).json({ error: "server" });
  }
}
