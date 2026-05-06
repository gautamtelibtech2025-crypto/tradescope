# TradeScope FYERS Auto-Exchange Deployment Guide

**Status**: Code is ready. Backend now uses Python for proven FYERS exchange.

## Architecture

```
[Browser] 
  → Click "🔐 Generate Access Token"
  → FYERS login page
  → FYERS redirects to: https://tradescope-frontend.onrender.com/callback?code=AUTH_CODE
  → Frontend extracts AUTH_CODE
  → Frontend POSTs to: https://<backend>.onrender.com/api/fyers/token with { code: AUTH_CODE }
  → Backend spawns Python script (scripts/fyers_token.py)
  → Python exchanges code with FYERS for access_token + refresh_token
  → Backend stores token securely
  → Frontend shows success ✓
```

## Quick Deploy (Render)

### Step 1: Create Backend Service on Render

1. Go to **render.com** → Dashboard
2. Click **+ New** → **Web Service**
3. Select **GitHub repository** (tradescope)
4. Settings:
   - **Name**: `tradescope-backend` (or your choice)
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Runtime**: `Node`
   - **Region**: Same as frontend (India recommended)

5. Click **Create Web Service**

### Step 2: Set Environment Variables

After creation, in Render dashboard:

1. Go to your backend service → **Environment**
2. Add these variables:

```
FYERS_APP_ID=<your-fyers-app-id>
FYERS_SECRET_ID=<your-fyers-secret-id>
FYERS_REDIRECT_URI=https://tradescope-frontend.onrender.com/callback
FRONTEND_ORIGIN=https://tradescope-frontend.onrender.com
PORT=10000
```

3. Save → Service will auto-redeploy

### Step 3: Get Backend URL

After deployment completes:

1. In Render, go to backend service
2. Copy the URL (e.g., `https://tradescope-backend-xxx.onrender.com`)
3. Keep this URL for next step

### Step 4: Configure Frontend

On the live app (https://tradescope-frontend.onrender.com):

1. Open the app → Click **⚙ Setup**
2. Paste backend URL into **"Backend API URL"** field:
   ```
   https://tradescope-backend-xxx.onrender.com
   ```
3. Save (it's stored in browser localStorage)

### Step 5: Test

1. Click **"🔐 Generate Access Token"**
2. Complete FYERS login (when prompted)
3. FYERS redirects back to app
4. App should show: **"✓ FYERS token exchange complete"**
5. Auto-connect runs and shows: **"✓ Connected! Scanner server ready."**

---

## Verify It's Working

### From Browser Console (on /callback after FYERS redirect):

```javascript
// Check backend URL is configured
localStorage.getItem('ts_backend_api_url')

// Check if POST worked
fetch(localStorage.getItem('ts_backend_api_url').replace(/\/$/,'') + '/api/fyers/debug')
  .then(r=>r.json()).then(console.log).catch(console.error)

// Should show:
// { fyers_app_id_present: true, redirect_uri_configured: true, token_stored: true, ... }
```

### Check Backend Logs (Render):

1. Go to Render backend service → **Logs**
2. Should see:
```
TradeScope backend listening on 10000
```

3. If auth code is posted, you'll see Python execution logs

---

## Troubleshooting

### Issue: Backend returns "FYERS_APP_ID and FYERS_SECRET_ID must be configured"

**Fix**: 
- Go to Render backend → Environment
- Confirm `FYERS_APP_ID` and `FYERS_SECRET_ID` are set correctly (not empty)
- Redeploy: go to Deployments → scroll down → click **Redeploy** on latest

### Issue: "Token exchange failed: Python script execution timed out"

**Fix**: 
- Render Python environment may not be pre-installed
- Add to render.yaml or Procfile:
```
python_version = "3.10"
```
- Or ensure `python3` is in PATH (request Render support)

### Issue: "Auth code expires within 5-10 minutes"

**Fix**:
- Auth codes are short-lived — the whole flow (login → redirect → exchange) must complete in ~5 min
- If step is slow, try again

### Issue: "Invalid FYERS client configuration"

**Fix**:
- The FYERS_APP_ID and FYERS_SECRET_ID might be wrong
- Double-check them in FYERS Developer panel
- Make sure FYERS app has redirect URI: `https://tradescope-frontend.onrender.com/callback` registered

---

## Alternative: Use Supabase Edge Function (Fallback)

If backend deploy fails, the frontend will automatically fallback to Supabase function at:
```
https://<your-supabase-project>.supabase.co/functions/v1/fyers-token
```

To enable this fallback:

1. Deploy to Supabase:
```bash
supabase link --project-ref <your-ref>
supabase functions deploy fyers-token
```

2. Set Supabase secrets:
```bash
supabase secrets set FYERS_APP_ID="<app-id>"
supabase secrets set FYERS_SECRET_ID="<secret>"
```

3. Leave "Backend API URL" empty in frontend setup — it will auto-use Supabase function

---

## Summary

✅ **Code is ready** — Python exchange logic is wired into Node backend
✅ **Frontend is ready** — Auto-redirect callback and exchange
✅ **You need to do**:
  1. Deploy backend service to Render
  2. Set FYERS_APP_ID and FYERS_SECRET_ID in Render environment
  3. Paste backend URL into frontend setup
  4. Test the flow

**Expected time**: ~10 minutes

---

## Full Auto-Flow Example

```
User action       │ System action
────────────────────────────────────────────────────────────────
Click button      │ Frontend opens: https://api-t1.fyers.in/api/v3/generate-authcode?client_id=...&redirect_uri=.../callback
User logs in FYERS│ FYERS creates auth code
User authorizes   │ FYERS redirects: .../callback?code=XYZ...ABC...
Browser loads     │ Frontend: syncTokenFromUrl() extracts code from URL
Frontend posts    │ POST /api/fyers/token { code: "XYZ...ABC..." }
Backend runs      │ Python script spawned with auth code + FYERS secrets
Python calls      │ FYERS validate-authcode endpoint
FYERS responds    │ Returns: { access_token: "...", refresh_token: "..." }
Backend saves     │ saveFyersToken({ accessToken, refreshToken, appId })
Backend returns   │ { success: true, token_stored: true }
Frontend sees OK  │ Shows: "✓ FYERS token exchange complete"
Frontend auto-    │ connectApp() calls Supabase connect function
connects          │ Connect function runs scan setup
User sees         │ "✓ Connected! Scanner server ready"
                  │ Can now use scanners
```

---

**Questions?** Check the logs in Render or run browser console commands above to see exact error messages.
