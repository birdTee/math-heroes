-- Math Heroes: run this once in Supabase → SQL Editor → New query → Run
create table if not exists public.mh_docs (
  path       text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.mh_docs enable row level security;
drop policy if exists "mh read"   on public.mh_docs;
drop policy if exists "mh insert" on public.mh_docs;
drop policy if exists "mh update" on public.mh_docs;
create policy "mh read"   on public.mh_docs for select to anon, authenticated using (true);
create policy "mh insert" on public.mh_docs for insert to anon, authenticated with check (path like 'players/%');
create policy "mh update" on public.mh_docs for update to anon, authenticated using (path like 'players/%') with check (path like 'players/%');
