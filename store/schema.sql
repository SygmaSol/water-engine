-- Water Knowledge store (Supabase project "Water Knowledge", ref xyspexrszjvthlwawcnq)
-- Shared, customer-data-free store: knowledge docs (audience-tagged, pgvector), tariff rate sets,
-- typical-use reference. Consumed by the LeakGuard assistant (service role, all audiences) and the
-- public CD Water Hub (anon key, RLS-filtered to public docs). NO customer data lives here, ever.

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- knowledge_docs — one row per doc, audience-tagged, embedded on write
-- ---------------------------------------------------------------------------
create table public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  body text not null,
  audience text not null check (audience in ('public','leakguard','both')),
  lang text not null default 'en' check (lang in ('en','es')),
  tags text[] not null default '{}',
  embedding vector(1024),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_docs enable row level security;

-- Anon (the public CD hub) can only ever see public/both docs. No client write policies exist:
-- writes are service-role only. The LeakGuard assistant reads with the service role (bypasses RLS).
create policy "anon_select_public_docs" on public.knowledge_docs
  for select to anon, authenticated using (audience in ('public','both'));

-- ---------------------------------------------------------------------------
-- water_tariffs — versioned rate sets; public reference data (anon-readable)
-- ---------------------------------------------------------------------------
create table public.water_tariffs (
  id text primary key,                 -- e.g. '2011_current', '2026_proposed'
  label_en text not null,
  label_es text not null,
  status text not null check (status in ('current','proposed','historical')),
  effective text not null,             -- ISO date or 'pending'
  source text not null,                -- provenance of the set as a whole
  rates jsonb not null,                -- the RateSet object the engine consumes (see package types)
  updated_at timestamptz not null default now()
);

alter table public.water_tariffs enable row level security;
create policy "anyone_reads_tariffs" on public.water_tariffs
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- typical_use — litres per activity, each row SOURCED (cite, don't invent)
-- ---------------------------------------------------------------------------
create table public.typical_use (
  id text primary key,                 -- e.g. 'toilet_flush'
  label_en text not null,
  label_es text not null,
  litres numeric not null,
  unit_en text not null,               -- e.g. 'per flush'
  unit_es text not null,
  source_name text not null,
  source_url text not null,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.typical_use enable row level security;
create policy "anyone_reads_typical_use" on public.typical_use
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- housekeeping triggers: touch updated_at; dirty the embedding when content changes
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.dirty_embedding_on_content_change() returns trigger
language plpgsql as $$
begin
  if (new.body is distinct from old.body or new.title is distinct from old.title)
     and new.embedding is not distinct from old.embedding then
    new.embedding = null;              -- embedding=NULL marks the row for re-embedding
  end if;
  new.updated_at = now();
  return new;
end $$;

create trigger knowledge_docs_touch before update on public.knowledge_docs
  for each row execute function public.dirty_embedding_on_content_change();
create trigger water_tariffs_touch before update on public.water_tariffs
  for each row execute function public.touch_updated_at();
create trigger typical_use_touch before update on public.typical_use
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- match_knowledge — semantic retrieval with the audience filter enforced server-side.
-- SECURITY INVOKER (the default): RLS on knowledge_docs applies to the caller, so an anon
-- call can NEVER surface 'leakguard' docs regardless of p_audience. p_audience narrows further
-- within what the caller may see ('all' = no extra filter, useful to the service role only).
-- ---------------------------------------------------------------------------
create or replace function public.match_knowledge(
  query_embedding vector(1024),
  p_audience text default 'public',
  match_count int default 5
) returns table (slug text, title text, body text, audience text, tags text[], similarity double precision)
language sql stable
as $$
  select k.slug, k.title, k.body, k.audience, k.tags,
         1 - (k.embedding <=> query_embedding) as similarity
  from public.knowledge_docs k
  where k.embedding is not null
    and (p_audience = 'all' or k.audience = p_audience or k.audience = 'both')
  order by k.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20)
$$;
