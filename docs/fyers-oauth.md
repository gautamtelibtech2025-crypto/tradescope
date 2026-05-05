# FYERS OAuth Flow

## FYERS Dashboard

Use these values in the FYERS app dashboard:

- Website URL: `https://tradescope-frontend.onrender.com`
- Redirect URI: `https://tradescope-frontend.onrender.com/auth/callback`

The Website URL is only your app homepage. The Redirect URI is the exact callback URL FYERS sends the auth code to.

## Frontend Flow

The production app should not show a permanent FYERS login button.

For developer testing, open:

```text
https://tradescope-frontend.onrender.com/?devAuth=1
```

That can expose a manual auth trigger in the React implementation. The existing static frontend also supports manually opening FYERS auth from setup, but its redirect URI now points to `/auth/callback`.

The callback route extracts the code from either of these FYERS callback shapes:

```text
/auth/callback?s=ok&code=AUTH_CODE
/auth/callback?s=ok&auth_code=AUTH_CODE
```

Then it posts:

```http
POST /api/fyers/token
Content-Type: application/json

{ "code": "AUTH_CODE" }
```

## Backend Flow

The Express backend:

1. Reads `FYERS_APP_ID` and `FYERS_SECRET_ID`.
2. Generates `appIdHash = SHA256(FYERS_APP_ID + ":" + FYERS_SECRET_ID)`.
3. Calls `https://api-t1.fyers.in/api/v3/validate-authcode`.
4. Stores the access token in server memory.
5. Returns a success response without exposing the token unless `FYERS_RETURN_TOKEN=true`.

## Render Static Rewrite

For the current static frontend, `render.yaml` must rewrite every nested path to `tradescope-frontend.html`:

```yaml
services:
  - type: web
    name: tradescope-frontend
    runtime: static
    staticPublishPath: .
    routes:
      - type: rewrite
        source: /*
        destination: /tradescope-frontend.html
```

For the React/Vite frontend, use this Render static publish path instead:

```yaml
staticPublishPath: frontend/dist
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

## Backend Render Service

Create a Render Web Service from `backend`:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Set environment variables from `backend/.env.example`.

## Manual Token Fallback

Local helper:

```powershell
.\scripts\fyers-token.ps1 -Setup
.\scripts\fyers-token.ps1
```

Python helper:

```bash
set FYERS_APP_ID=YOUR_APP_ID-100
set FYERS_SECRET_ID=YOUR_SECRET_ID
set FYERS_REDIRECT_URI=https://tradescope-frontend.onrender.com/auth/callback
python scripts/fyers_token.py --auth-code PASTE_AUTH_CODE
```

Direct auth-code fallback:

```powershell
.\scripts\fyers-token.ps1 -AuthCode "PASTE_CODE_OR_FULL_REDIRECT_URL"
```

The helper accepts both `code=` and `auth_code=` callback parameters.
