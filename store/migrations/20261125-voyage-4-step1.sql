-- Voyage 4, step 1 (25 Nov 2026): a v4 column beside the old one, the trigger dirtying both,
-- and a v4 search. Nothing reads the new column until each reader switches; the old column and
-- match_knowledge keep serving both live water assistants meanwhile.
alter table public.knowledge_docs add column if not exists embedding_v4 vector(1024);

create or replace function public.dirty_embedding_on_content_change() returns trigger
language plpgsql as $$
begin
  -- each space is nulled on its own test, so the seed's own path (body changed together with
  -- embedding: null) still dirties embedding_v4
  if (new.body is distinct from old.body or new.title is distinct from old.title) then
    if new.embedding is not distinct from old.embedding then
      new.embedding = null;            -- NULL marks the row for re-embedding (voyage-3.5-lite)
    end if;
    if new.embedding_v4 is not distinct from old.embedding_v4 then
      new.embedding_v4 = null;         -- and for voyage-4-lite
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;

-- match_knowledge on the voyage-4-lite column. SECURITY INVOKER (the default), as match_knowledge:
-- RLS on knowledge_docs applies to the caller, so an anon call never surfaces 'leakguard' docs.
create or replace function public.match_knowledge_v4(
  query_embedding vector(1024),
  p_audience text default 'public',
  match_count int default 5
) returns table (slug text, title text, body text, audience text, tags text[], similarity double precision)
language sql stable
as $$
  select k.slug, k.title, k.body, k.audience, k.tags,
         1 - (k.embedding_v4 <=> query_embedding) as similarity
  from public.knowledge_docs k
  where k.embedding_v4 is not null
    and (p_audience = 'all' or k.audience = p_audience or k.audience = 'both')
  order by k.embedding_v4 <=> query_embedding
  limit least(greatest(match_count, 1), 20)
$$;
