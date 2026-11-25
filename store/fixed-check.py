#!/usr/bin/env python3
"""Run the Water Knowledge fixed questions (fixed-questions.json) against a search.

  VAULT=/tmp/pbs python3 store/fixed-check.py --model voyage-3.5-lite --fn match_knowledge
  VAULT=/tmp/pbs python3 store/fixed-check.py --model voyage-4-lite  --fn match_knowledge_v4

Each question must return its expected doc first at its audience. Prints the top 3 per
question and exits 1 on any miss, so a model move that changes what a customer sees stops.
Read-only: it embeds the questions and calls the search, nothing else.
"""
import argparse, json, os, subprocess, sys, urllib.request

VAULT = os.environ.get("VAULT", "/tmp/pbs")
REF = "xyspexrszjvthlwawcnq"
HERE = os.path.dirname(os.path.abspath(__file__))


def embed(texts, model):
    key = (os.environ.get("VOYAGE_API_KEY")
           or open(f"{VAULT}/Library/processes/secrets/voyage-api-key").read()).strip()
    body = {"input": texts, "model": model, "input_type": "query", "output_dimension": 1024}
    r = urllib.request.Request("https://api.voyageai.com/v1/embeddings", json.dumps(body).encode(),
                               {"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    return [d["embedding"] for d in json.load(urllib.request.urlopen(r, timeout=60))["data"]]


def search(fn, vec, audience):
    sql = f"select slug from public.{fn}('{json.dumps(vec)}'::vector, '{audience}', 3)"
    out = subprocess.run([sys.executable, f"{VAULT}/lg-sql.py", "--ref", REF, sql],
                         capture_output=True, text=True, env={**os.environ, "VAULT": VAULT}).stdout
    return [r["slug"] for r in json.loads(out.strip().splitlines()[-1])]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--fn", required=True)
    a = ap.parse_args()
    qs = json.load(open(f"{HERE}/fixed-questions.json"))["questions"]
    vecs = embed([q["q"] for q in qs], a.model)
    misses = 0
    for q, v in zip(qs, vecs):
        top = search(a.fn, v, q["audience"])
        ok = bool(top) and top[0] == q["expect"]
        misses += not ok
        print(f"{'PASS' if ok else 'MISS'}  [{q['audience']}] {q['q']}\n      -> {top}")
    print(f"\n{len(qs) - misses}/{len(qs)} pass ({a.model}, {a.fn})")
    sys.exit(1 if misses else 0)


if __name__ == "__main__":
    main()
