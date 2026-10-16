// The @ of people on the Kumbra waiting list, plus the app's founders (the beta accounts), for the lights
// on the teaser's mountain (www.axclimb.com/kumbra). Only the usernames: never emails, who invited whom or
// anything else. Also how many there are and the latest sign-ups with their date, for the
// "@x se ha unido hace 2 h" line (those @ are already public on the mountain).
//
// The mountain can't show everyone once the list is long, but everyone can be found:
//   GET /api/kumbraFounders        -> { names: up to LIGHTS, newest first; total: everyone; recent }
//   GET /api/kumbraFounders?q=ana  -> { matches: up to MATCHES usernames starting with "ana" (exact one first) }
// Read with the service-role key (set in Vercel as SUPABASE_SERVICE_ROLE_KEY), cached for a minute.

const SUPABASE_URL = "https://raaokvljxioaxaoqcjxa.supabase.co";
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const QUERY_RE = /^[a-z0-9_.]{1,20}$/;
const LIGHTS = 300;
const MATCHES = 8;
const RECENT = 6;

const clean = (n) => String(n || "").toLowerCase();
// For PostgREST's ilike: "_" is a wildcard there, so it's escaped.
const likePrefix = (q) => encodeURIComponent(`${q.replace(/_/g, "\\_")}*`);

/** Rows plus the full count (Content-Range: 0-299/4123). */
async function fetchCounted(url, headers) {
  const response = await fetch(url, { headers: { ...headers, Prefer: "count=exact" } });
  if (!response.ok) throw new Error(`${response.status} ${await response.text().catch(() => "")}`);
  const total = Number((response.headers.get("content-range") || "").split("/")[1]);
  return { rows: await response.json(), total: Number.isFinite(total) ? total : null };
}

async function search(q, headers) {
  const [waitlist, founders] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=username&username=ilike.${likePrefix(q)}&order=username.asc&limit=${MATCHES}`, { headers }),
    fetch(`${SUPABASE_URL}/rest/v1/profiles?select=handle&is_founder=eq.true&handle=ilike.${likePrefix(q)}&order=handle.asc&limit=${MATCHES}`, { headers }),
  ]);
  const listed = waitlist.ok ? (await waitlist.json()).map((r) => r.username) : [];
  const beta = founders.ok ? (await founders.json()).map((r) => r.handle) : [];
  const found = [...new Set([...listed, ...beta].map(clean).filter((n) => USERNAME_RE.test(n)))].sort();
  // The exact name first, then the rest in order.
  return [...found.filter((n) => n === q), ...found.filter((n) => n !== q)].slice(0, MATCHES);
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method" });
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const q = clean(req.query?.q).replace(/^@/, "");
  if (!key) return res.status(200).json(q ? { matches: [] } : { names: [], total: 0, recent: [] });
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    if (req.query?.q !== undefined) {
      if (!QUERY_RE.test(q)) return res.status(200).json({ matches: [] });
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      return res.status(200).json({ matches: await search(q, headers) });
    }
    const [waitlist, founders] = await Promise.all([
      fetchCounted(`${SUPABASE_URL}/rest/v1/waitlist?select=username,created_at&order=created_at.desc&limit=${LIGHTS}`, headers),
      fetchCounted(`${SUPABASE_URL}/rest/v1/profiles?select=handle&is_founder=eq.true&order=created_at.desc&limit=${LIGHTS}`, headers).catch(() => ({ rows: [], total: 0 })),
    ]);
    const recent = waitlist.rows
      .filter((r) => USERNAME_RE.test(clean(r.username)) && r.created_at)
      .slice(0, RECENT)
      .map((r) => ({ name: clean(r.username), at: r.created_at }));
    // Newest first, so whoever just joined is on the mountain; the beta founders after.
    const names = [...new Set([...waitlist.rows.map((r) => r.username), ...founders.rows.map((r) => r.handle)].map(clean).filter((n) => USERNAME_RE.test(n)))]
      .slice(0, LIGHTS);
    // Everyone, not only the ones sent (a founder who also reserved counts once only while both lists fit).
    const total = Math.max(names.length, (waitlist.total ?? waitlist.rows.length) + (founders.total ?? founders.rows.length) - (waitlist.rows.length + founders.rows.length - names.length));
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ names, total, recent });
  } catch (error) {
    console.error("kumbraFounders", error);
    return res.status(200).json(q ? { matches: [] } : { names: [], total: 0, recent: [] });
  }
}
