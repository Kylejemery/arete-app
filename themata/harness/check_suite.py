#!/usr/bin/env python3
"""Check that the harness runs the suite the ledger holds.

Compares `lake exe harness --items` (the suite as encoded in
lean/Stoic/Harness/Suite.lean) with evidence/suite.yaml: the same ids, the
same verdicts, and the same non_formal flags. Exits non-zero on any mismatch.

    python3 themata/harness/check_suite.py
"""
import json
import pathlib
import subprocess
import sys

import yaml

root = pathlib.Path(__file__).resolve().parent.parent
ledger = yaml.safe_load((root / "evidence" / "suite.yaml").read_text())
out = subprocess.run(
    ["lake", "exe", "harness", "--items"],
    cwd=root / "lean", capture_output=True, text=True, check=True,
).stdout
encoded = json.loads(out.strip().splitlines()[-1])

want = {e["id"]: (e["verdict"], "non_formal" in (e.get("flags") or [])) for e in ledger}
have = {e["id"]: (e["verdict"], e["non_formal"]) for e in encoded}

problems = []
for i in sorted(set(want) | set(have)):
    if i not in have:
        problems.append(f"{i}: in suite.yaml, not encoded")
    elif i not in want:
        problems.append(f"{i}: encoded, not in suite.yaml")
    elif want[i] != have[i]:
        problems.append(f"{i}: ledger {want[i]}, encoded {have[i]}")

if problems:
    print("\n".join(problems))
    sys.exit(1)
print(f"OK: {len(want)} items match suite.yaml")
