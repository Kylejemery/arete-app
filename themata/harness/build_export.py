#!/usr/bin/env python3
"""Build the explorer data export in results/explorer/.

Runs `lake exe harness --export ../results/explorer`, which writes every
verdict (harness.json and runs/cNN.json), then joins the ledger text the page
shows beside them into items.json, folds the runs into one record per distinct
search in searches.json, and writes index.json. This script computes no
verdict and no match. It only copies ledger fields and checks
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
  harness wrote, under all eight (cond, redundancy) combinations;
* invariance: the eight runs of each search (one per cond x redundancy) agree
  on every field but `setting` and `matches_ledger`, and `matches_ledger`
  varies with `cond` only;
* every file validates against schema.json.

Needs PyYAML and jsonschema (`pip install pyyaml jsonschema`), and git, for
the commit the export was generated from.
"""
import csv
import hashlib
import json
import pathlib
import re
import subprocess
import sys

import jsonschema
import yaml

root = pathlib.Path(__file__).resolve().parent.parent
out = root / "results" / "explorer"
problems = []


def collapse(s):
    return re.sub(r"\s+", " ", s or "").strip()

def ledger_passage(e):
    """The entry's quotation. An entry citing several research refs keeps them
    in `passages: [{ref, text}]`; it is shown as one passage, each quotation
    led by its ref's locator in brackets."""
    if e.get("passages"):
        refs = e["research_ref"]
        return " ".join(f"[{refs[t['ref']]['locator']}] {collapse(t['text'])}" for t in e["passages"])
    return collapse(e.get("passage"))


def git(*args, cwd=None):
    return subprocess.run(["git", *args], cwd=cwd or repo, check=True, capture_output=True, text=True).stdout


def sha256_files(paths):
    """One digest over the files' paths and contents, in path order."""
    h = hashlib.sha256()
    for rel in sorted(paths):
        h.update(rel.encode() + b"\0" + hashlib.sha256((repo / rel).read_bytes()).hexdigest().encode() + b"\n")
    return h.hexdigest()


# What the export was generated from. The commit is HEAD of the checkout; the
# encoding version is a digest of every tracked file under themata/lean/, so
# two exports with the same digest ran the same Lean code whatever the commit.
repo = pathlib.Path(git("rev-parse", "--show-toplevel", cwd=root).strip())
lean_files = [f for f in git("ls-files", "--", "themata/lean").splitlines() if f]
inputs = ["themata/lean", "themata/evidence", "themata/harness"]
source = {
    "commit": git("rev-parse", "HEAD").strip(),
    "inputs_clean": git("status", "--porcelain", "--", *inputs).strip() == "",
    "inputs": [p + "/" for p in inputs],
    "encoding_version": {
        "sha256": sha256_files(lean_files),
        "scope": "every tracked file under themata/lean/, paths and contents",
        "files": len(lean_files),
        "lean_toolchain": (root / "lean" / "lean-toolchain").read_text().strip(),
    },
    "ledger_sha256": sha256_files(["themata/evidence/suite.yaml"]),
}


if "--no-run" not in sys.argv:
    subprocess.run(["lake", "exe", "harness", "--export", str(out)], cwd=root / "lean", check=True)

harness = json.loads((out / "harness.json").read_text())
ledger = yaml.safe_load((root / "evidence" / "suite.yaml").read_text())
editorial = yaml.safe_load((root / "harness" / "explorer_inputs.yaml").read_text())
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
    if e.get("verified_by_kyle") and not e.get("verified_on"):
        problems.append(f"{i}: signed off without a verified_on date")

# Editorial inputs are quotations, checked.
examples = editorial.get("examples") or {}
for i, ex in examples.items():
    if i not in by_id:
        problems.append(f"example for unknown item {i}")
    elif collapse(ex["text"]) not in ledger_passage(by_id[i]):
        problems.append(f"{i}: example is not quoted from the ledger passage")
extra_secondary = editorial.get("secondary_summary") or {}
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


def non_primary(e):
    """Flagged when the evidence does not reach the corpus as a primary text:
    a Mode 2 summary, or ancient text quoted in a secondary work (Zeller).
    Neither counts as evidence until milestone 4 (SCOPE.md)."""
    w = witness(e)
    basis = {
        "primary": None,
        "ancient_text_via_secondary_work": "ancient text quoted in a secondary work, not a primary edition",
        "mode2_summary": "a Mode 2 summary of a modern book",
    }[w]
    return {"flag": w != "primary", "witness": w, "basis": basis}


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
        "duplicate_variant": h.get("duplicate_variant"),
        "provenance": {
            "source": e["source"],
            "passage": ledger_passage(e),
            "corpus_ref": e.get("corpus_ref"),
            "research_ref": e.get("research_ref"),
            "verified_by_kyle": e["verified_by_kyle"],
            "verified_on": str(e["verified_on"]) if e.get("verified_by_kyle") and e.get("verified_on") else None,
            "witness": witness(e),
            "secondary_summary": secondary(e),
            "non_primary": non_primary(e),
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
run_records = 0
groups = {}  # (candidate, single, contra, view, item) -> [(cond, redundancy, run)]
for c in harness["candidates"]:
    runs = json.loads((out / c["file"]).read_text())
    if runs["name"] != c["name"]:
        problems.append(f"{c['file']}: holds {runs['name']}, expected {c['name']}")
    seen = set()
    for r in runs["runs"]:
        seen.add((r["setting"], r["item"]))
        if r["ancient_verdict"] != by_id[r["item"]]["verdict"]:
            problems.append(f"{c['name']} {r['item']}: run verdict {r['ancient_verdict']} is not the ledger's")
        run_records += 1
        p = settings[r["setting"]]
        label = f"{p['single']}/{p['contra']}/{p['view']}"
        groups.setdefault((c["index"], p["single"], p["contra"], p["view"], r["item"]), []).append(
            (p["cond"], p["redundancy"], r))
        if not depth_note:
            m = matrix.get((c["name"], label))
            if m is None or m[r["item"]] != r["cell"]:
                problems.append(f"{c['name']} {label} {r['item']}: export {r['cell']}, matrix.csv {m and m[r['item']]}")
    want = {(s, i["id"]) for s in settings for i in formal}
    if seen != want:
        problems.append(f"{c['file']}: {len(want - seen)} runs missing, {len(seen - want)} unexpected")

# Invariance. Derivability reads only single, contra and view, so the eight
# runs of one search, one per (cond, redundancy), must agree on everything
# the search produced. matches_ledger may differ, but only with cond: for a
# valid_nonsyllogistic item it also asks the DL 7.77 criterion, which reads
# cond and not redundancy.
proof_settings = [{"id": f"{s}/{m}/{v}", "single": s, "contra": m, "view": v,
                   "run_settings": [k for k, p in settings.items()
                                    if (p["single"], p["contra"], p["view"]) == (s, m, v)]}
                  for s in harness["parameters"]["single"]
                  for m in harness["parameters"]["contra"]
                  for v in harness["parameters"]["view"]]
n_combos = len(harness["parameters"]["cond"]) * len(harness["parameters"]["redundancy"])
searches = {ps["id"]: {} for ps in proof_settings}
counts = {"unit": "distinct searches: candidate x proof setting (single, contra, view) x formal item",
          "searches": 0, "derived": 0, "not_found_within_depth": 0, "proven_underivable": 0,
          "size_bound_hits": 0,
          "matches_ledger": {"yes": 0, "no": 0, "unknown": 0, "varies_with_cond": 0},
          "redundant_variants": 0, "variant_derivation_lost": 0, "variant_loss_proven": 0,
          "duplicate_variants": 0, "duplicate_derivation_lost": 0, "duplicate_loss_proven": 0,
          "variants_by_view": {v: {k: {"derived": 0, "not_found_within_depth": 0, "proven_underivable": 0}
                                   for k in ("redundant_variant", "duplicate_variant")}
                               for v in harness["parameters"]["view"]},
          "run_records": run_records}
varying = set()
for (ci, s, m, v, item), rs in sorted(groups.items()):
    if len(rs) != n_combos:
        problems.append(f"candidate {ci} {s}/{m}/{v} {item}: {len(rs)} runs, expected {n_combos}")
        continue
    strip = lambda r: {k: x for k, x in r.items() if k not in ("setting", "matches_ledger")}
    first = strip(rs[0][2])
    if any(strip(r) != first for _, _, r in rs):
        problems.append(f"candidate {ci} {s}/{m}/{v} {item}: runs differ across cond or redundancy")
        continue
    by_cond = {}
    for cond, _, r in rs:
        if by_cond.setdefault(cond, r["matches_ledger"]) != r["matches_ledger"]:
            problems.append(f"candidate {ci} {s}/{m}/{v} {item}: matches_ledger varies with redundancy")
    rec = {k: x for k, x in first.items() if k not in ("item", "ancient_verdict")}
    if len(set(by_cond.values())) == 1:
        rec["matches_ledger"] = rs[0][2]["matches_ledger"]
        counts["matches_ledger"][rec["matches_ledger"]] += 1
    else:
        rec["matches_ledger"] = {cond: by_cond[cond] for cond in harness["parameters"]["cond"]}
        counts["matches_ledger"]["varies_with_cond"] += 1
        varying.add(item)
    searches[f"{s}/{m}/{v}"].setdefault(str(ci), {})[item] = rec
    counts["searches"] += 1
    counts[rec["status"]] += 1
    counts["size_bound_hits"] += bool(rec.get("truncated"))
    if "redundant_variant" in rec:
        rv = rec["redundant_variant"]
        counts["redundant_variants"] += 1
        counts["variant_derivation_lost"] += rv["derivation_lost"]
        counts["variant_loss_proven"] += rv["status"] == "proven_underivable"
        counts["variants_by_view"][v]["redundant_variant"][rv["status"]] += 1
    if "duplicate_variant" in rec:
        dv = rec["duplicate_variant"]
        counts["duplicate_variants"] += 1
        counts["duplicate_derivation_lost"] += dv["derivation_lost"]
        counts["duplicate_loss_proven"] += dv["status"] == "proven_underivable"
        counts["variants_by_view"][v]["duplicate_variant"][dv["status"]] += 1
    if ("redundant_variant" in rec) != ("duplicate_variant" in rec):
        problems.append(f"candidate {ci} {s}/{m}/{v} {item}: one redundant variant without the other")
invariance = {
    "method": ("lake exe harness --export runs every search once under each of the "
               f"{n_combos} (cond, redundancy) combinations; this script compares the {n_combos} "
               "records field by field. An observed check on this suite and these candidates, "
               "not a theorem."),
    "searches_checked": counts["searches"],
    "fields_identical": "every field except setting and matches_ledger",
    "matches_ledger": {
        "varies_with_cond": counts["matches_ledger"]["varies_with_cond"],
        "items": sorted(varying),
        "varies_with_redundancy": 0,
        "why": "for a valid_nonsyllogistic item matches_ledger also asks the DL 7.77 criterion, which reads cond",
    },
}
failure_policy = ("The harness has no timeout: every search runs to its depth or size bound, and a run "
                  "stopped by the size bound is recorded, not failed (size_bound_hits). build_export.py "
                  "stops on any error or failed check, and lake exe harness --export stops if any "
                  "reduction fails to replay, so an export that is written has no failed runs.")

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
        "searches": "searches.json",
        "schema": "schema.json",
        "runs": [c["file"] for c in harness["candidates"]],
    },
    "generated_by": "themata/harness/build_export.py, from lake exe harness --export and evidence/suite.yaml",
    "bounds": harness["bounds"],
    "axes": {"candidates": len(harness["candidates"]), "settings": len(harness["settings"]),
             "formal_items": len(formal), "ledger_items": len(ledger)},
    "source": source,
    "counts": counts,
    "invariance": invariance,
    "failed_runs": [],
    "failure_policy": failure_policy,
    "review_status": {
        "ledger_entries_verified_by_kyle": f"{verified} of {len(ledger)}",
        "specialist_review": "not yet",
        "caution": "Guardrail 5 (THEMATA_PROJECT.md): no public claims until a specialist in Stoic logic has reviewed the ledger and the formalization.",
    },
    "cross_checks": depth_note or "every cell agrees with results/matrix.csv under all eight (cond, redundancy) combinations",
}
searches_doc = {
    "unit": counts["unit"],
    "proof_settings": proof_settings,
    "invariance": invariance,
    "searches": searches,
}

# Every file validates against the schema before anything is written.
schema = json.loads((out / "schema.json").read_text())
docs = {"index": index, "harness": harness, "items": items, "searches": searches_doc}
docs.update({c["file"]: ("runs", json.loads((out / c["file"]).read_text())) for c in harness["candidates"]})
for name, doc in docs.items():
    kind, doc = doc if isinstance(doc, tuple) else (name, doc)
    try:
        jsonschema.validate(doc, {"$ref": f"#/$defs/{kind}", "$defs": schema["$defs"]},
                            cls=jsonschema.Draft202012Validator)
    except jsonschema.ValidationError as err:
        problems.append(f"{name}: {err.message} at {'/'.join(map(str, err.absolute_path))}")
if problems:
    print("\n".join(problems[:50]))
    sys.exit(1)

(out / "items.json").write_text(json.dumps(items, ensure_ascii=False, indent=1) + "\n")
(out / "searches.json").write_text(json.dumps(searches_doc, ensure_ascii=False, separators=(",", ":")) + "\n")
(out / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n")
print(f"OK: {counts['searches']} distinct searches ({run_records} run records), "
      f"{counts['redundant_variants']} fresh-atom and {counts['duplicate_variants']} duplicate variants; "
      f"{len(items)} items joined; {index['cross_checks']}")
if not source["inputs_clean"]:
    print("warning: themata/lean, evidence or harness has uncommitted changes; index.json records inputs_clean: false")
