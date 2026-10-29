#!/usr/bin/env python3
"""WorldEye connector for RavenScope — runs the genuine RavenScope program
with one addition: an `Access-Control-Allow-Origin: *` header on its local
API responses.

Why this exists: stock RavenScope (github.com/tmanish/raven-scope) sends no
CORS header, and every web browser refuses to let a web page read a
cross-origin response without one — so the WorldEye /sensing page cannot
read your local RavenScope until the header is present. This file does not
reimplement anything: it imports RavenScope itself, patches the two places
its server writes response headers, and then runs RavenScope's own CLI
entry point, unchanged. All sensing still happens on your machine, exactly
as with `python3 -m ravenscope`; nothing is sent anywhere new — the header
simply gives your browser permission to read the program it is already
running locally.

Usage (from inside your raven-scope clone):
    python3 ravenscope-web.py                # real sensing, as usual
    python3 ravenscope-web.py --simulate     # RavenScope's demo pattern
All normal RavenScope flags work — they are RavenScope's own.
"""

import ravenscope.server as _srv

_orig_send = _srv._Handler._send


def _send_cors(self, code, body, ctype="application/json"):
    self.send_response(code)
    self.send_header("Content-Type", ctype)
    self.send_header("Content-Length", str(len(body)))
    self.send_header("Cache-Control", "no-store")
    self.send_header("Access-Control-Allow-Origin", "*")
    self.end_headers()
    self.wfile.write(body)


_srv._Handler._send = _send_cors

_orig_stream = _srv._Handler._stream


def _stream_cors(self):
    orig_send_header = self.send_header

    def send_header_with_cors(keyword, value):
        orig_send_header(keyword, value)
        if keyword.lower() == "content-type":
            orig_send_header("Access-Control-Allow-Origin", "*")

    self.send_header = send_header_with_cors
    try:
        _orig_stream(self)
    finally:
        self.send_header = orig_send_header


_srv._Handler._stream = _stream_cors

from ravenscope.cli import main

if __name__ == "__main__":
    main()
