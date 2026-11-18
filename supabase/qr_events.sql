-- Kumbra QR landing (axclimb.com/kumbra/join?src=...). APPLIED in production on 2026-11-18.
-- One row per page visit ('visit') and per jump to a store ('store', automatic redirect or button
-- tap). Only api/kumbraQr.js writes, with the service-role key (RLS on, no policies). Anonymous.
create table if not exists public.qr_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  src         text not null check (src ~ '^[a-z0-9_-]{1,40}$'),
  kind        text not null check (kind in ('visit', 'store')),
  platform    text not null check (platform in ('ios', 'android', 'other')),
  visitor     text check (visitor ~ '^[a-z0-9]{8,32}$')  -- unused (kept nullable)
);
create index if not exists qr_events_created_idx on public.qr_events (created_at);
alter table public.qr_events enable row level security;

-- Handy query: visits and store jumps per src.
-- select src, kind, platform, count(*) from qr_events group by 1,2,3 order by 1,2,3;
