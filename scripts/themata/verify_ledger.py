"""Read-only check of Themata ledger passages against the live stores (guardrail 1).

    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
      python3 scripts/themata/verify_ledger.py [themata/evidence/suite.yaml]

For each entry:
  * corpus_ref: the chunk must exist in rag_corpus with deprecated = false, and
    every fragment of `passage` (split at ellipses) must be a whitespace-collapsed
    substring of its chunk_text.
  * research_ref (one ref, or a list with `passages: [{ref, text}]`): each
    quotation goes whole to research_quotation_problems(source_id, passage,
    attribution, locator), with the entry's `source` line as attribution and the
    ref's locator. It must come back with no problems: every fragment in the
    text, the source live and not 'unconfirmed', and for a 'quotation_only'
    source at most 60 words with author, work, translator and year named.
A cited passage with nothing left to check (empty, or only fragments under
eight characters) fails. Entries with no citation are listed, not failed.
Exits 1 if any check fails.
Reads only; it never writes to the database.
"""
import json, os, re, sys, urllib.request
import yaml

URL, KEY = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEAD = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


def call(path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(urllib.request.Request(URL + path, data=data, headers=HEAD)) as r:
        return json.load(r)


def ws(s):
    return re.sub(r"\s+", " ", s).strip()


def fragments(passage):
    return [ws(p) for p in re.split(r"\s*(?:…|\.\.\.)\s*", passage or "") if len(ws(p)) >= 8]


def research_checks(entry):
    refs = entry.get("research_ref")
    if not refs:
        return []
    if isinstance(refs, dict):
        refs, texts = [refs], [{"ref": 0, "text": entry.get("passage")}]
    else:
        texts = entry.get("passages", [])
    out = []
    for t in texts:
        ref = refs[t["ref"]]
        if not fragments(t["text"]):
            continue
        probs = call("/rest/v1/rpc/research_quotation_problems", {
            "p_source": ref["source_id"], "p_passage": t["text"],
            "p_attribution": entry.get("source"), "p_locator": ref.get("locator")})
        out.append((ref["locator"], not probs, probs))
    return out


path = sys.argv[1] if len(sys.argv) > 1 else "themata/evidence/suite.yaml"
failed = False
for e in yaml.safe_load(open(path)):
    line = [e["id"]]
    if e.get("corpus_ref"):
        rows = call(f"/rest/v1/rag_corpus?id=eq.{e['corpus_ref']}&select=chunk_text,deprecated,text_type")
        if not rows:
            line.append("corpus_ref MISSING"); failed = True
        else:
            row = rows[0]; text = ws(row["chunk_text"])
            frs = fragments(e.get("passage"))
            miss = [f for f in frs if f not in text]
            bad = row["deprecated"] or miss or not frs
            failed |= bool(bad)
            line.append(f"corpus {row['text_type']} {'DEPRECATED ' if row['deprecated'] else ''}{len(frs) - len(miss)}/{len(frs)}")
            line += [f"  missing: {m[:80]}" for m in miss]
    rc = research_checks(e)
    if e.get("research_ref") and not rc:
        line.append("research_ref has no passage to check"); failed = True
    if rc:
        ok = sum(1 for _, v, _ in rc if v)
        failed |= ok < len(rc)
        line.append(f"research {ok}/{len(rc)} ({', '.join(sorted({l for l, _, _ in rc}))})")
        line += [f"  {l}: {'; '.join(p)}" for l, v, p in rc if not v]
    if len(line) == 1:
        line.append("no citation to check")
    print(" | ".join(line))
sys.exit(1 if failed else 0)
