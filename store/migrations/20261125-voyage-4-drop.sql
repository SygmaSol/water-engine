-- Voyage 4, the drop (25 Nov 2026): both water assistants read match_knowledge_v4 and embed-docs writes embedding_v4
-- only, so the voyage-3.5-lite column and its search go. The trigger first: it names the old column.
create or replace function public.dirty_embedding_on_content_change() returns trigger
language plpgsql as $$
begin
  if (new.body is distinct from old.body or new.title is distinct from old.title)
     and new.embedding_v4 is not distinct from old.embedding_v4 then
    new.embedding_v4 = null;           -- NULL marks the row for re-embedding (voyage-4-lite, embed-docs)
  end if;
  new.updated_at = now();
  return new;
end $$;
drop function if exists public.match_knowledge(vector, text, integer);
alter table public.knowledge_docs drop column if exists embedding;
