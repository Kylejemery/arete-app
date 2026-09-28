#!/usr/bin/env python3
"""pd-ingest/extract-pdf.py — a scan's text layer into the raw cache.

    python3 pd-ingest/extract-pdf.py <slug> <pdf> <source_url>

For a public domain scan that reaches us as a PDF rather than by fetch (a
file Kyle downloaded, a host this container cannot reach). Writes
data/raw/<slug>/<pdf stem>.txt with one form feed between scan leaves, the
layout the ia-ocr parser reads, and records the PDF's hash beside it in
manifest.json. The text is committed; the PDF is gitignored and kept by hash
only, like every other PDF in the cache.

A leaf with no text layer comes out empty rather than skipped, so leaf
numbers stay aligned with the scan. Requires pypdf (pip install pypdf).
"""

import datetime
import hashlib
import json
import os
import sys

from pypdf import PdfReader, __version__ as PYPDF_VERSION

RAW_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../data/raw'))


def main():
    if len(sys.argv) != 4:
        sys.exit('usage: extract-pdf.py <slug> <pdf> <source_url>')
    slug, pdf, url = sys.argv[1:]
    raw = open(pdf, 'rb').read()
    leaves = [(page.extract_text() or '') for page in PdfReader(pdf).pages]
    # A form feed inside a leaf would break the leaf count.
    text = '\f'.join(leaf.replace('\f', '\n') for leaf in leaves)
    body = text.encode('utf-8')

    out_dir = os.path.join(RAW_ROOT, slug)
    os.makedirs(out_dir, exist_ok=True)
    name = os.path.splitext(os.path.basename(pdf))[0] + '.txt'
    with open(os.path.join(out_dir, name), 'wb') as f:
        f.write(body)

    manifest_path = os.path.join(out_dir, 'manifest.json')
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {'files': {}}
    manifest['files'][name] = {
        'url': url,
        'retrieved_at': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
        'sha256': hashlib.sha256(body).hexdigest(),
        'bytes': len(body),
        'extracted_from': {
            'pdf': os.path.basename(pdf),
            'sha256': hashlib.sha256(raw).hexdigest(),
            'bytes': len(raw),
            'leaves': len(leaves),
            'tool': f'pypdf {PYPDF_VERSION}',
        },
    }
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')
    empty = sum(1 for leaf in leaves if len(leaf.strip()) < 20)
    print(f'{slug}: {len(leaves)} leaves ({empty} empty or near-empty) -> {os.path.relpath(os.path.join(out_dir, name))}')


if __name__ == '__main__':
    main()
