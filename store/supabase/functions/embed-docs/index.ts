// Embed-on-write pipeline for the Water Knowledge store: embeds knowledge_docs rows whose
// embedding IS NULL (or an explicit slug list) with Voyage voyage-3.5-lite, 1024-dim,
// input_type "document" — byte-identical parameters to the CC's embedding pipeline, so query
// embeddings (input_type "query") land in the same space.
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

  let query = db.from("knowledge_docs").select("id, slug, title, body");
  query = Array.isArray(slugs) && slugs.length ? query.in("slug", slugs) : query.is("embedding", null);
  const { data: docs, error } = await query;
  if (error) return json({ error: error.message }, 500);
  if (!docs || docs.length === 0) return json({ ok: true, embedded: 0 });

  const embedded: string[] = [];
  for (let i = 0; i < docs.length; i += 96) {
    const chunk = docs.slice(i, i + 96);
    const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("VOYAGE_API_KEY")}`,
      },
      body: JSON.stringify({
        input: chunk.map((d) => `${d.title}\n\n${d.body}`),
        model: "voyage-3.5-lite",
        input_type: "document",
        output_dimension: 1024,
      }),
    });
    if (!resp.ok) return json({ error: `voyage ${resp.status}: ${await resp.text()}` }, 502);
    const { data } = await resp.json();
    for (let j = 0; j < chunk.length; j++) {
      const { error: uerr } = await db
        .from("knowledge_docs")
        .update({ embedding: JSON.stringify(data[j].embedding) })
        .eq("id", chunk[j].id);
      if (uerr) return json({ error: uerr.message, embedded }, 500);
      embedded.push(chunk[j].slug);
    }
  }
  return json({ ok: true, embedded: embedded.length, slugs: embedded });
});
