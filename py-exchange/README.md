py-exchange service

A minimal Flask wrapper around `scripts/fyers_token.py` that accepts POST /exchange with JSON:

{
  "auth_code": "...",
  "app_id": "...",
  "secret_id": "..."
}

and returns the JSON output produced by the Python script.

Deploy this as a small web service (Render, Fly, Heroku). Example Render settings:
- Root: `py-exchange`
- Build: `pip install -r requirements.txt`
- Start: `python app.py`
- PORT env: Render sets automatically

Security: Only deploy this endpoint to a trusted environment; it accepts secret_id in request — prefer setting secrets as environment variables or using the backend proxy for production.
