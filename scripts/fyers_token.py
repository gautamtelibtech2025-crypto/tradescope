#!/usr/bin/env python3

"""Exchange a FYERS auth code for an access token.

This script mirrors the app's FYERS validate-authcode flow, but stays fully
in Python and does not require the browser callback handler.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass


FYERS_VALIDATE_URL = "https://api-t1.fyers.in/api/v3/validate-authcode"
DEFAULT_REDIRECT_URI = "https://tradescope-frontend.onrender.com/auth/callback"


@dataclass(frozen=True)
class FyersConfig:
    app_id: str
    secret_id: str
    redirect_uri: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Exchange a FYERS auth code for an access token.",
    )
    parser.add_argument("--app-id", default=os.getenv("FYERS_APP_ID", ""), help="FYERS app ID")
    parser.add_argument("--secret-id", default=os.getenv("FYERS_SECRET_ID", ""), help="FYERS secret ID")
    parser.add_argument(
        "--redirect-uri",
        default=os.getenv("FYERS_REDIRECT_URI", DEFAULT_REDIRECT_URI),
        help="FYERS redirect URI used during login",
    )
    parser.add_argument("--auth-code", default="", help="Raw auth code returned by FYERS")
    parser.add_argument("--auth-url", default="", help="Full FYERS redirect URL containing code/auth_code")
    parser.add_argument(
        "--print-json",
        action="store_true",
        help="Print the full FYERS response as JSON after the token",
    )
    return parser.parse_args()


def extract_code(raw_value: str) -> str:
    value = (raw_value or "").strip()
    if not value:
        return ""

    parsed = urllib.parse.urlparse(value)
    if parsed.scheme and parsed.query:
        query = urllib.parse.parse_qs(parsed.query)
        for key in ("auth_code", "code"):
            if key in query and query[key]:
                return query[key][0].strip()

    match = re.search(r"(?:[?&](?:auth_code|code)=)([^&\s]+)", value)
    if match:
        return match.group(1).strip()

    if re.fullmatch(r"[A-Za-z0-9._-]+", value):
        return value

    return ""


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_config(args: argparse.Namespace) -> FyersConfig:
    app_id = (args.app_id or "").strip()
    secret_id = (args.secret_id or "").strip()
    redirect_uri = (args.redirect_uri or "").strip() or DEFAULT_REDIRECT_URI

    if not app_id or not secret_id:
        raise SystemExit(
            "FYERS_APP_ID and FYERS_SECRET_ID are required. Set env vars or pass --app-id and --secret-id."
        )

    return FyersConfig(app_id=app_id, secret_id=secret_id, redirect_uri=redirect_uri)


def resolve_auth_code(args: argparse.Namespace) -> str:
    for candidate in (args.auth_code, args.auth_url):
        code = extract_code(candidate)
        if code:
            return code

    if not sys.stdin.isatty():
        code = extract_code(sys.stdin.read())
        if code:
            return code

    return extract_code(input("Paste FYERS auth code or full callback URL: "))


def request_token(config: FyersConfig, auth_code: str) -> dict:
    app_id_hash = sha256_hex(f"{config.app_id}:{config.secret_id}")
    payload = {
        "grant_type": "authorization_code",
        "appIdHash": app_id_hash,
        "code": auth_code,
    }
    request = urllib.request.Request(
        FYERS_VALIDATE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body.strip() else {}
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(
            f"FYERS token request failed ({exc.code} {exc.reason}).\n{error_body or 'No response body returned.'}"
        ) from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"FYERS token request failed: {exc.reason}") from exc


def main() -> int:
    args = parse_args()
    config = load_config(args)
    auth_code = resolve_auth_code(args)

    if not auth_code:
        raise SystemExit("No auth code found. Pass --auth-code or --auth-url.")

    response = request_token(config, auth_code)
    access_token = str(response.get("access_token", "")).strip()

    if not access_token:
        pretty = json.dumps(response, indent=2, ensure_ascii=False)
        raise SystemExit(f"FYERS response did not include access_token.\n{pretty}")

    print(access_token)
    if args.print_json:
        print(json.dumps(response, indent=2, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())