// Embed-on-write pipeline for the Water Knowledge store: embeds knowledge_docs rows with no vector (or an explicit slug
// list) into embedding_v4, voyage-4-lite, input_type "document", 1024-dim, read by match_knowledge_v4. The voyage-3.5-lite
// column and match_knowledge were dropped on 25 Nov 2026 once both water assistants read v4 (the Voyage 4 move).
// A row edited while this runs is not written (its updated_at no longer matches what was read);
// the trigger has already nulled it, so the next run embeds the new text.
// Auth: service-role bearer ONLY. Anon/authenticated calls are rejected.
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// The gateway (verify_jwt=true) has already verified the token's signature; we gate on the
// verified role claim so only the service role may trigger embedding (works for both legacy
// JWT keys and whatever the platform injects as env — no key-era coupling).
function callerRole(token: string): string | null {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64)).role ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (callerRole(token) !== "service_role") return json({ error: "Unauthorized" }, 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { slugs } = await req.json().catch(() => ({ slugs: undefined }));

  let query = db.from("knowledge_docs").select("id, slug, title, body, updated_at, embedding_v4");
  query = Array.isArray(slugs) && slugs.length
    ? query.in("slug", slugs)
    : query.is("embedding_v4", null);
  const { data: docs, error } = await query;
  if (error) return json({ error: error.message }, 500);
  if (!docs || docs.length === 0) return json({ ok: true, embedded: 0 });

  const SPACES = [
    { column: "embedding_v4", model: "voyage-4-lite" },
  ] as const;
  const forced = Array.isArray(slugs) && slugs.length > 0;
  const embedded: string[] = [];
  const skipped: string[] = [];
  for (let i = 0; i < docs.length; i += 96) {
    const chunk = docs.slice(i, i + 96);
    // one Voyage call per space, for the rows of this chunk that need that space
    const vectors = new Map<string, Record<string, string>>();
    for (const sp of SPACES) {
      const need = chunk.filter((d) => forced || d[sp.column] == null);
      if (need.length === 0) continue;
      const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("VOYAGE_API_KEY")}`,
        },
        body: JSON.stringify({
          input: need.map((d) => `${d.title}\n\n${d.body}`),
          model: sp.model,
          input_type: "document",
          output_dimension: 1024,
        }),
      });
      if (!resp.ok) return json({ error: `voyage ${sp.model} ${resp.status}: ${await resp.text()}`, embedded }, 502);
      const { data } = await resp.json();
      need.forEach((d, j) => {
        const row = vectors.get(d.id) ?? {};
        row[sp.column] = JSON.stringify(data[j].embedding);
        vectors.set(d.id, row);
      });
    }
    for (const d of chunk) {
      const update = vectors.get(d.id);
      if (!update) continue;
      // written only if the row is unchanged since it was read
      const { data: done, error: uerr } = await db
        .from("knowledge_docs")
        .update(update)
        .eq("id", d.id)
        .eq("updated_at", d.updated_at)
        .select("id");
      if (uerr) return json({ error: uerr.message, embedded }, 500);
      (done && done.length ? embedded : skipped).push(d.slug);
    }
  }
  return json({ ok: true, embedded: embedded.length, slugs: embedded, skipped_edited: skipped });
});
