from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from fetch_veille_rss import OUTPUT_PATH, REFRESH_MAX_AGE_SECONDS, dataset_age_seconds, refresh_if_stale

HOST = os.environ.get("VEILLE_REFRESH_HOST", "127.0.0.1").strip() or "127.0.0.1"
PORT = int(os.environ.get("VEILLE_REFRESH_PORT", "8787"))


class VeilleHandler(BaseHTTPRequestHandler):
    server_version = "JasirVeilleRefresh/1.0"

    def _send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/veille-refresh":
            params = parse_qs(parsed.query)
            force = params.get("force", ["0"])[0] in {"1", "true", "yes"}
            payload = refresh_if_stale(force=force)
            self._send_json(payload)
            return

        if parsed.path == "/api/veille-status":
            age = dataset_age_seconds()
            payload = {
                "status": "ok",
                "exists": OUTPUT_PATH.exists(),
                "output_path": str(OUTPUT_PATH),
                "listen_host": HOST,
                "listen_port": PORT,
                "age_seconds": None if age is None else round(age, 2),
                "max_age_seconds": REFRESH_MAX_AGE_SECONDS,
            }
            self._send_json(payload)
            return

        self._send_json({"status": "not_found"}, status=404)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return


def main() -> None:
    Path(OUTPUT_PATH).parent.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), VeilleHandler)
    print(f"Veille refresh server listening on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
