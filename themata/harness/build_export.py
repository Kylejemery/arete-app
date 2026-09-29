#!/usr/bin/env python3
"""Build the explorer data export in results/explorer/.

Runs `lake exe harness --export ../results/explorer`, which writes every
verdict (harness.json and runs/cNN.json), then joins the ledger text the page
shows beside them into items.json and writes index.json. This script
computes no verdict and no match. It only copies ledger fields and checks
that the pieces agree; any disagreement exits non-zero and nothing is left
half-written as if it were current.

    python3 themata/harness/build_export.py            # run the harness, then join
    python3 themata/harness/build_export.py --no-run   # join an existing harness export

Checks:
* the harness's items are the ledger's (ids, verdicts, non_formal flags);
* every example in explorer_inputs.yaml is quoted from its item's passage, and
  every secondary-summary quote from its item's notes;
* every run records the ledger's verdict for its item, and every candidate
  has one run per (setting, formal item);
* every cell agrees with results/matrix.csv, which the matrix run of the same
  harness wrote, under all eight (cond, redundancy) combinations.
"""
import csv
import json
import pathlib
import re
import subprocess
import sys

import yaml

root = pathlib.Path(__file__).resolve().parent.parent
out = root / "results" / "explorer"
problems = []


def collapse(s):
    return re.sub(r"\s+", " ", s or "").strip()


if "--no-run" not in sys.argv:
    subprocess.run(["lake", "exe", "harness", "--export", str(out)], cwd=root / "lean", check=True)

harness = json.loads((out / "harness.json").read_text())
ledger = yaml.safe_load((root / "evidence" / "suite.yaml").read_text())
inputs = yaml.safe_load((root / "harness" / "explorer_inputs.yaml").read_text())
by_id = {e["id"]: e for e in ledger}
encoded = {i["id"]: i for i in harness["items"]}

# The harness runs the ledger's suite.
if set(by_id) != set(encoded):
    problems.append(f"ids differ: ledger only {sorted(set(by_id) - set(encoded))}, harness only {sorted(set(encoded) - set(by_id))}")
for i in sorted(set(by_id) & set(encoded)):
    e, h = by_id[i], encoded[i]
    if e["verdict"] != h["ancient_verdict"]:
        problems.append(f"{i}: ledger verdict {e['verdict']}, harness {h['ancient_verdict']}")
    if ("non_formal" in (e.get("flags") or [])) != h["non_formal"]:
        problems.append(f"{i}: non_formal flag differs")

# Editorial inputs are quotations, checked.
examples = inputs.get("examples") or {}
for i, ex in examples.items():
    if i not in by_id:
        problems.append(f"example for unknown item {i}")
    elif collapse(ex["text"]) not in collapse(by_id[i]["passage"]):
        problems.append(f"{i}: example is not quoted from the ledger passage")
extra_secondary = inputs.get("secondary_summary") or {}
for i, s in extra_secondary.items():
    if i not in by_id or collapse(s["quote"]) not in collapse(by_id[i].get("notes")):
        problems.append(f"{i}: secondary_summary quote is not in the ledger notes")


def witness(e):
    """How the item's evidence reaches the corpus, read from the ledger's
    `source` field (suite.yaml header: primary witness, verbatim ancient text
    quoted in a secondary work, or a Mode 2 summary)."""
    src = e["source"]
    if "Mode 2 summary" in src:
        return "mode2_summary"
    if "as reported in" in src or "quoted in" in src:
        return "ancient_text_via_secondary_work"
    return "primary"


def secondary(e):
    src = e["source"]
    if "Mode 2 summary" in src:
        parts = [p for p in src.split(";") if p.strip()]
        whole = all("Mode 2 summary" in p for p in parts)
        return {"flag": True, "scope": "whole" if whole else "partial",
                "basis": "the ledger source names a Mode 2 summary"}
    if e["id"] in extra_secondary:
        return {"flag": True, "scope": "partial",
                "basis": "ledger notes: " + collapse(extra_secondary[e["id"]]["quote"])}
    return {"flag": False, "scope": None, "basis": None}


items = []
for e in ledger:
    h = encoded.get(e["id"], {})
    ex = examples.get(e["id"])
    items.append({
        "id": e["id"],
        "schema": e["schema"],
        "kind": e["kind"],
        "flags": e.get("flags") or [],
        "ancient_verdict": e["verdict"],
        "confidence": e["confidence"],
        "in_formal_suite": not h.get("non_formal", True),
        "example": {"text": collapse(ex["text"]), "language": ex["language"], "note": ex.get("note")} if ex else None,
        "encoded": h.get("encoded"),
        "theory": h.get("theory"),
        "encoding_note": h.get("encoding_note"),
        "semantics": h.get("semantics"),
        "redundant_variant": h.get("redundant_variant"),
        "provenance": {
            "source": e["source"],
            "passage": collapse(e["passage"]),
            "corpus_ref": e.get("corpus_ref"),
            "research_ref": e.get("research_ref"),
            "verified_by_kyle": e["verified_by_kyle"],
            "witness": witness(e),
            "secondary_summary": secondary(e),
            "notes": (e.get("notes") or "").strip(),
        },
    })

# Every run is present and carries the ledger's verdict.
formal = [i for i in harness["items"] if not i["non_formal"]]
settings = {s["id"]: s["params"] for s in harness["settings"]}
matrix = {}
with open(root / "results" / "matrix.csv", newline="") as f:
    for row in csv.DictReader(f):
        matrix[(row["candidate"], row["setting"])] = row
depth_note = ""
if f"depth {harness['bounds']['depth']}," not in (root / "results" / "matrix.md").read_text():
    depth_note = "matrix.csv was written at a different depth; cells not compared"
counts = {"runs": 0, "derived": 0, "not_found_within_depth": 0, "proven_underivable": 0,
          "matches_ledger": {"yes": 0, "no": 0, "unknown": 0},
          "redundant_variants": 0, "variant_derivation_lost": 0, "variant_loss_proven": 0}
for c in harness["candidates"]:
    runs = json.loads((out / c["file"]).read_text())
    if runs["name"] != c["name"]:
        problems.append(f"{c['file']}: holds {runs['name']}, expected {c['name']}")
    seen = set()
    for r in runs["runs"]:
        seen.add((r["setting"], r["item"]))
        if r["ancient_verdict"] != by_id[r["item"]]["verdict"]:
            problems.append(f"{c['name']} {r['item']}: run verdict {r['ancient_verdict']} is not the ledger's")
        counts["runs"] += 1
        counts[r["status"]] += 1
        counts["matches_ledger"][r["matches_ledger"]] += 1
        if "redundant_variant" in r:
            v = r["redundant_variant"]
            counts["redundant_variants"] += 1
            counts["variant_derivation_lost"] += v["derivation_lost"]
            counts["variant_loss_proven"] += v["status"] == "proven_underivable"
        if not depth_note:
            p = settings[r["setting"]]
            label = f"{p['single']}/{p['contra']}/{p['view']}"
            m = matrix.get((c["name"], label))
            if m is None or m[r["item"]] != r["cell"]:
                problems.append(f"{c['name']} {label} {r['item']}: export {r['cell']}, matrix.csv {m and m[r['item']]}")
    want = {(s, i["id"]) for s in settings for i in formal}
    if seen != want:
        problems.append(f"{c['file']}: {len(want - seen)} runs missing, {len(seen - want)} unexpected")

if problems:
    print("\n".join(problems[:50]))
    if len(problems) > 50:
        print(f"... and {len(problems) - 50} more")
    sys.exit(1)

verified = sum(1 for e in ledger if e["verified_by_kyle"])
index = {
    "title": "Themata machine: explorer data",
    "files": {
        "harness": "harness.json",
        "items": "items.json",
        "runs": [c["file"] for c in harness["candidates"]],
    },
    "generated_by": "themata/harness/build_export.py, from lake exe harness --export and evidence/suite.yaml",
    "bounds": harness["bounds"],
    "axes": {"candidates": len(harness["candidates"]), "settings": len(harness["settings"]),
             "formal_items": len(formal), "ledger_items": len(ledger)},
    "counts": counts,
    "review_status": {
        "ledger_entries_verified_by_kyle": f"{verified} of {len(ledger)}",
        "specialist_review": "not yet",
        "caution": "Guardrail 5 (THEMATA_PROJECT.md): no public claims until a specialist in Stoic logic has reviewed the ledger and the formalization.",
    },
    "cross_checks": depth_note or "every cell agrees with results/matrix.csv under all eight (cond, redundancy) combinations",
}
(out / "items.json").write_text(json.dumps(items, ensure_ascii=False, indent=1) + "\n")
(out / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n")
print(f"OK: {counts['runs']} runs, {counts['redundant_variants']} redundant variants; "
      f"{len(items)} items joined; {index['cross_checks']}")
