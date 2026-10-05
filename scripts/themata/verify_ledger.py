"""Read-only check of Themata ledger passages against the live stores (guardrail 1).

    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
      python3 scripts/themata/verify_ledger.py [themata/evidence/suite.yaml]

The rules live in one place, the database function themata_ledger_problems
(supabase/migrations/20261005191145_themata_ledger_problems.sql), which the
nightly auditor's repo.themata_ledger probe calls too, so the two cannot drift
apart. This script parses the YAML, sends the entries, and prints the result:
one line per entry, its problems indented under it. Entries with no citation
are listed, not failed. Exits 1 if any entry has a problem.
Reads only; it never writes to the database.
"""
import json, os, sys, urllib.request
import yaml

URL, KEY = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEAD = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

path = sys.argv[1] if len(sys.argv) > 1 else "themata/evidence/suite.yaml"
entries = yaml.safe_load(open(path)) or []
body = json.dumps({"p_entries": entries}, default=str).encode()
req = urllib.request.Request(URL + "/rest/v1/rpc/themata_ledger_problems", data=body, headers=HEAD)
with urllib.request.urlopen(req) as r:
    rows = json.load(r)

failed = False
for row in rows:
    checked, problems = row["checked"] or [], row["problems"] or []
    if not checked and not problems:
        print(f"{row['entry_id']} | no citation to check")
        continue
    failed |= bool(problems)
    print(f"{row['entry_id']} | {'FAIL' if problems else 'ok'} | {', '.join(checked)}")
    for p in problems:
        print(f"    {p}")
sys.exit(1 if failed else 0)
