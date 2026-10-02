#!/usr/bin/env python3
"""Bring stoic_qca_codebook.xlsx into line with data.ts.

data.ts is the source of truth for the Stoic QCA page. This script writes two
things from it into the published workbook, and touches nothing else:

  Scores    the score and flag cells of each case row (names, periods,
            sources and notes are left as they are)
  Evidence  one row per evidence item: the score, what its level means in the
            codebook, the rationale, the citation, the verbatim excerpt, the
            rag_corpus chunk id and a Reading Room link. Rebuilt in full each run.

Standard library only, so it runs anywhere without installing anything:

  python3 academy/web/scripts/stoic_qca_workbook.py          # write the workbook
  python3 academy/web/scripts/stoic_qca_workbook.py --check  # exit 1 if it is out of date

Run it after any change to CASES or EVIDENCE in data.ts (for example after
pasting an admin export from the page), and commit the workbook with data.ts.
"""

import io
import json
import re
import sys
import zipfile
from pathlib import Path
from urllib.parse import urlencode
from xml.sax.saxutils import escape

WEB = Path(__file__).resolve().parent.parent
DATA_TS = WEB / "src/app/research/stoic-qca/data.ts"
XLSX = WEB / "public/research/stoic-qca/stoic_qca_codebook.xlsx"
SITE = "https://academy.pursuearete.com"

SETS = ["POW", "WLTH", "ADV", "TEACH", "PROF", "COURT", "CONS"]
FLAGS = {"TEACH_KNOWN": "teachKnown", "CONS_TESTED": "consTested"}
MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_WS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
CT_WS = "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"

# Cell styles already in the workbook: white bold header on fill, plain wrapped
# text, plain wrapped number. Not the blue font, which marks editable inputs.
HEAD, TEXT, NUM = 5, 6, 17


# ---------------------------------------------------------------- data.ts

def json_literal(src, head):
    """The JSON literal assigned by `head` (CASES and EVIDENCE are plain JSON)."""
    start = src.index(head) + len(head)
    depth, i, in_str, esc = 0, start, False, False
    while True:
        ch = src[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        elif ch == '"':
            in_str = True
        elif ch in "[{":
            depth += 1
        elif ch in "]}":
            depth -= 1
            if depth == 0:
                return json.loads(src[start:i + 1])
        i += 1


def anchors(src):
    out = {}
    for m in re.finditer(r'\{ set: "(\w+)", label: "([^"]*)", anchors: "([^"]*)" \}', src):
        levels = {}
        for lv in re.finditer(r"(1|0\.67|0\.33|0): (.*?)(?= (?:1|0\.67|0\.33|0): |$)", m.group(3)):
            text = lv.group(2).strip()
            levels[float(lv.group(1))] = text[:1].upper() + text[1:]
        out[m.group(1)] = {"label": m.group(2), "levels": levels}
    return out


def load_data():
    src = DATA_TS.read_text(encoding="utf-8")
    cases = json_literal(src, "export const CASES: StoicCase[] = ")
    evidence = json_literal(src, "export const EVIDENCE: Record<string, Record<SetName, ScoreEvidence>> = ")
    return cases, evidence, anchors(src)


# ---------------------------------------------------------------- xml helpers

_BAD = re.compile("[\x00-\x08\x0b\x0c\x0e-\x1f￾￿]")


def col(n):
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def text_cell(ref, value, style):
    if value is None or value == "":
        return f'<c r="{ref}" s="{style}"/>'
    v = escape(_BAD.sub("", str(value)))
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{v}</t></is></c>'


def num_cell(ref, value, style):
    return f'<c r="{ref}" s="{style}" t="n"><v>{fmt_num(value)}</v></c>'


def fmt_num(v):
    return str(int(v)) if float(v).is_integer() else repr(float(v))


# ---------------------------------------------------------------- Scores

def sync_scores(sheet_xml, shared, cases):
    """Rewrite the numeric score and flag cells of Scores from CASES."""
    by_name = {c["name"]: c for c in cases}
    rows = re.findall(r"<row [^>]*>.*?</row>", sheet_xml, re.S)
    header = {}
    for ref, attrs, v in re.findall(r'<c r="([A-Z]+)1"([^>]*)>(?:<f>.*?</f>)?<v>(.*?)</v>', rows[0]):
        header[ref] = shared[int(v)] if 't="s"' in attrs else v
    wanted = {ref: name for ref, name in header.items() if name in SETS or name in FLAGS}
    missing = (set(SETS) | set(FLAGS)) - set(wanted.values())
    if missing:
        sys.exit(f"Scores sheet has no column for {sorted(missing)}")

    seen, changes = set(), []

    def fix_row(row):
        m = re.search(r'<c r="A(\d+)"[^>]*t="s"[^>]*><v>(\d+)</v>', row)
        if not m or m.group(1) == "1":
            return row
        name = shared[int(m.group(2))]
        case = by_name.get(name)
        if case is None:
            return row
        seen.add(name)
        r = m.group(1)

        def fix_cell(cm):
            ref_col = cm.group(1)
            key = wanted.get(ref_col)
            if key is None:
                return cm.group(0)
            want = case["scores"][key] if key in SETS else case[FLAGS[key]]
            have = float(cm.group(3))
            if abs(have - want) < 1e-9:
                return cm.group(0)
            changes.append(f"{name} {key}: {fmt_num(have)} -> {fmt_num(want)}")
            return f"{cm.group(0)[:cm.start(3) - cm.start(0)]}{fmt_num(want)}{cm.group(0)[cm.end(3) - cm.start(0):]}"

        return re.sub(rf'<c r="([A-Z]+){r}"([^>]*)><v>([-0-9.eE]+)</v></c>', fix_cell, row)

    out = re.sub(r"<row [^>]*>.*?</row>", lambda m: fix_row(m.group(0)), sheet_xml, flags=re.S)
    unknown = set(by_name) - seen
    if unknown:
        sys.exit(f"Cases in data.ts with no row on the Scores sheet: {sorted(unknown)}. Add the row by hand first.")
    return out, changes


# ---------------------------------------------------------------- Evidence

COLUMNS = [
    ("Case", 22), ("Set", 8), ("Score", 7), ("Codebook meaning of the level", 30), ("Status", 10),
    ("Support", 13), ("Rationale", 50), ("Question raised in drafting", 45), ("Citation", 34),
    ("Excerpt (verbatim from the Arete corpus)", 60), ("Chunk ID (rag_corpus.id)", 38), ("Note", 26),
    ("Read in context", 50),
]


def reading_room(chunk_id, excerpt):
    params = {"chunk": chunk_id}
    if excerpt:
        opening = " ".join(excerpt.split()[:8])
        if opening:
            params["q"] = opening
    return f"{SITE}/library?{urlencode(params)}"


def evidence_sheet(cases, evidence, anchor):
    rows = []
    for c in cases:
        for k in SETS:
            score = c["scores"][k]
            e = (evidence.get(c["name"]) or {}).get(k)
            meaning = anchor.get(k, {}).get("levels", {}).get(round(score, 2), "")
            base = [c["name"], k, score, meaning]
            if not e:
                rows.append(base + ["", "", "No evidence drafted", "", "", "", "", "", ""])
                continue
            rationale = e["rationale"]
            if abs(e["scoredAs"] - score) > 1e-9:
                rationale = f"[Written for a score of {fmt_num(e['scoredAs'])}] {rationale}"
            head = base + [e["status"], e["support"], rationale, e.get("concern") or ""]
            items = e["evidence"] or [{"citation": "", "excerpt": None, "chunkId": None}]
            for v in items:
                link = reading_room(v["chunkId"], v.get("excerpt")) if v.get("chunkId") else ""
                rows.append(head + [v["citation"], v.get("excerpt") or "", v.get("chunkId") or "",
                                    v.get("note") or "", link])

    cols = "".join(
        f'<col min="{i}" max="{i}" width="{w}" customWidth="true"/>' for i, (_, w) in enumerate(COLUMNS, 1)
    )
    out = [f'<row r="1">' + "".join(text_cell(f"{col(i)}1", h, HEAD) for i, (h, _) in enumerate(COLUMNS, 1)) + "</row>"]
    for n, row in enumerate(rows, 2):
        cells = []
        for i, v in enumerate(row, 1):
            ref = f"{col(i)}{n}"
            cells.append(num_cell(ref, v, NUM) if i == 3 else text_cell(ref, v, TEXT))
        out.append(f'<row r="{n}">' + "".join(cells) + "</row>")
    last = f"{col(len(COLUMNS))}{len(rows) + 1}"
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        f'<worksheet xmlns="{MAIN_NS}" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<dimension ref="A1:{last}"/>'
        '<sheetViews><sheetView workbookViewId="0"><pane xSplit="2" ySplit="1" topLeftCell="C2" '
        'activePane="bottomRight" state="frozen"/></sheetView></sheetViews>'
        '<sheetFormatPr defaultRowHeight="15"/>'
        f"<cols>{cols}</cols>"
        f"<sheetData>{''.join(out)}</sheetData>"
        f'<autoFilter ref="A1:{last}"/>'
        "</worksheet>"
    ), len(rows)


# ---------------------------------------------------------------- workbook

def build(original):
    cases, evidence, anchor = load_data()
    zin = zipfile.ZipFile(io.BytesIO(original))
    files = {i.filename: zin.read(i.filename) for i in zin.infolist()}
    infos = zin.infolist()

    workbook = files["xl/workbook.xml"].decode("utf-8")
    rels = files["xl/_rels/workbook.xml.rels"].decode("utf-8")
    ctypes = files["[Content_Types].xml"].decode("utf-8")
    shared = [
        re.sub(r"<[^>]+>", "", s)
        for s in re.findall(r"<si>(.*?)</si>", files["xl/sharedStrings.xml"].decode("utf-8"), re.S)
    ]
    shared = [s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">") for s in shared]

    def sheet_path(name):
        m = re.search(rf'<sheet name="{re.escape(name)}"[^>]*r:id="(rId\d+)"', workbook)
        if not m:
            return None
        t = re.search(rf'Id="{m.group(1)}"[^>]*Target="([^"]+)"', rels)
        return "xl/" + t.group(1)

    scores_path = sheet_path("Scores")
    scores_xml, changes = sync_scores(files[scores_path].decode("utf-8"), shared, cases)
    files[scores_path] = scores_xml.encode("utf-8")
    if changes and "fullCalcOnLoad" not in workbook:
        # The Changes, Crisp and Paths sheets are formulas over Scores; have the
        # spreadsheet recalculate them when the file is opened.
        workbook = workbook.replace("<calcPr ", '<calcPr fullCalcOnLoad="1" ', 1)

    ev_xml, n_rows = evidence_sheet(cases, evidence, anchor)
    ev_path = sheet_path("Evidence")
    if ev_path is None:
        sheet_ids = [int(x) for x in re.findall(r'<sheet [^>]*sheetId="(\d+)"', workbook)]
        rel_ids = [int(x) for x in re.findall(r'Id="rId(\d+)"', rels)]
        nums = [int(x) for x in re.findall(r"worksheets/sheet(\d+)\.xml", rels)]
        rid, num = f"rId{max(rel_ids) + 1}", max(nums) + 1
        ev_path = f"xl/worksheets/sheet{num}.xml"
        workbook = workbook.replace(
            "</sheets>", f'<sheet name="Evidence" sheetId="{max(sheet_ids) + 1}" state="visible" r:id="{rid}"/></sheets>'
        )
        rels = rels.replace(
            "</Relationships>",
            f'<Relationship Id="{rid}" Type="{REL_WS}" Target="worksheets/sheet{num}.xml"/></Relationships>',
        )
        ctypes = ctypes.replace(
            "</Types>", f'<Override PartName="/{ev_path}" ContentType="{CT_WS}"/></Types>'
        )
    files[ev_path] = ev_xml.encode("utf-8")
    files["xl/workbook.xml"] = workbook.encode("utf-8")
    files["xl/_rels/workbook.xml.rels"] = rels.encode("utf-8")
    files["[Content_Types].xml"] = ctypes.encode("utf-8")

    # Keep the original entry order and timestamps, so running twice on the
    # same data.ts gives the same bytes.
    buf = io.BytesIO()
    stamp = infos[0].date_time
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zout:
        names = [i.filename for i in infos]
        for i in infos:
            info = zipfile.ZipInfo(i.filename, date_time=i.date_time)
            info.compress_type = zipfile.ZIP_DEFLATED
            zout.writestr(info, files[i.filename])
        for name in files:
            if name not in names:
                info = zipfile.ZipInfo(name, date_time=stamp)
                info.compress_type = zipfile.ZIP_DEFLATED
                zout.writestr(info, files[name])
    return buf.getvalue(), changes, n_rows


def main():
    check = "--check" in sys.argv[1:]
    original = XLSX.read_bytes()
    updated, changes, n_rows = build(original)
    if check:
        if updated != original:
            print(f"{XLSX.relative_to(WEB.parent.parent)} is out of date with data.ts. Run this script without --check.")
            sys.exit(1)
        print("Workbook matches data.ts.")
        return
    for c in changes:
        print("Scores:", c)
    if updated == original:
        print("Workbook already matches data.ts.")
        return
    XLSX.write_bytes(updated)
    print(f"Wrote {XLSX.relative_to(WEB.parent.parent)}: {len(changes)} score changes, Evidence sheet {n_rows} rows.")


if __name__ == "__main__":
    main()
