# FYERS OAuth Automation - Setup Guide

This guide walks through configuring the fully automated FYERS OAuth flow for TradeScope.

## Overview

The OAuth flow is now **fully automated and one-click**:
1. User clicks "Connect FYERS Account" button
2. System redirects to FYERS login
3. User authorizes TradeScope
4. FYERS redirects back to `/callback`
5. System automatically exchanges auth_code for access_token
6. Token stored securely on backend
7. User redirected to dashboard

**No manual copy/paste of auth codes required!**

## Architecture

```
Frontend (React)
  ↓ (1. Click "Connect FYERS")
FyersConnectButton
  ↓ (2. Fetch login URL)
Backend /api/fyers/login-url
  ↓ (3. Return FYERS auth URL)
FYERS OAuth Page
  ↓ (4. User authorizes)
Callback /callback
  ↓ (5. Extract auth_code)
Backend /api/fyers/token OR Supabase Edge Function
  ↓ (6. Exchange for access_token)
Backend Token Storage (secure)
  ↓ (7. Redirect home)
Dashboard
```

## Configuration

### 1. Frontend Environment Variables

Create or update `.env` in `frontend/`:

```env
# FYERS OAuth Configuration
VITE_FYERS_APP_ID=your_fyers_app_id_here
VITE_FYERS_REDIRECT_URI=https://tradescope-frontend.onrender.com/callback

# Backend API (for token exchange)
VITE_API_BASE_URL=https://tradescope-backend-api.onrender.com
```

**For Local Development:**
```env
VITE_FYERS_APP_ID=your_fyers_app_id
VITE_FYERS_REDIRECT_URI=http://localhost:5173/callback
VITE_API_BASE_URL=http://localhost:10000
```

### 2. Backend Environment Variables

Create or update `.env` in `backend/`:

```env
# FYERS Configuration (REQUIRED - must be set for OAuth to work)
FYERS_APP_ID=your_fyers_app_id
FYERS_SECRET_ID=your_fyers_secret_key
FYERS_REDIRECT_URI=https://tradescope-frontend.onrender.com/callback

# Frontend origin for CORS
FRONTEND_ORIGIN=https://tradescope-frontend.onrender.com
PORT=10000

# Optional: Return tokens to frontend (for testing only - not recommended for production)
# FYERS_RETURN_TOKEN=false
```

**For Local Development:**
```env
FYERS_APP_ID=your_fyers_app_id
FYERS_SECRET_ID=your_fyers_secret_key
FYERS_REDIRECT_URI=http://localhost:5173/callback
FRONTEND_ORIGIN=http://localhost:5173
PORT=10000
```

### 3. Supabase Configuration (if using Edge Functions)

Set secrets in Supabase project:

```bash
supabase secrets set FYERS_APP_ID "your_fyers_app_id"
supabase secrets set FYERS_SECRET_ID "your_fyers_secret_key"
```

Verify secrets are set:
```bash
supabase secrets list
```

### 4. Render Deployment

**For Frontend (Render):**
1. Go to Dashboard → Environment
2. Add these environment variables:
   ```
   VITE_FYERS_APP_ID=your_fyers_app_id
   VITE_FYERS_REDIRECT_URI=https://tradescope-frontend.onrender.com/callback
   VITE_API_BASE_URL=https://tradescope-backend-api.onrender.com
   ```
3. Trigger redeploy

**For Backend (Render):**
1. Go to Dashboard → Environment
2. Add these environment variables:
   ```
   FYERS_APP_ID=your_fyers_app_id
   FYERS_SECRET_ID=your_fyers_secret_key
   FYERS_REDIRECT_URI=https://tradescope-frontend.onrender.com/callback
   FRONTEND_ORIGIN=https://tradescope-frontend.onrender.com
   PORT=10000
   ```
3. Trigger redeploy

## How to Get FYERS Credentials

1. Go to [FYERS Developer Portal](https://developer.fyers.in)
2. Create an application
3. Configure OAuth redirect URI:
   - **Production:** `https://tradescope-frontend.onrender.com/callback`
   - **Development:** `http://localhost:5173/callback`
4. Copy your App ID and Secret Key

## File Changes Summary

### Frontend Files
- **App.jsx** - Added `/callback` route (primary)
- **Home.jsx** - Added "Connect FYERS Account" button
- **pages/Callback.jsx** - NEW - OAuth callback handler (better error handling)
- **components/FyersConnectButton.jsx** - NEW - One-click OAuth button
- **lib/fyersAuth.js** - Enhanced with better documentation
- **styles.css** - Added styling for new components

### Backend Files
- **fyersRoutes.js** - Enhanced `/token` endpoint with better error handling, validation, and timeout support

### Supabase Files
- **functions/fyers-token/index.ts** - Enhanced with better error messages, validation, and timeout support

## OAuth Flow Details

### Step 1: User Initiates Login
```
User clicks "Connect FYERS Account" button
↓
FyersConnectButton fetches /api/fyers/login-url
↓
Backend returns FYERS OAuth URL
```

### Step 2: FYERS Authorization
```
User redirected to FYERS login page
↓
User enters credentials and authorizes TradeScope
↓
FYERS redirects to https://tradescope-frontend.onrender.com/callback?code=AUTH_CODE
```

### Step 3: Code Exchange
```
Callback page extracts auth_code from URL
↓
Calls /api/fyers/token with auth_code
↓
Backend validates code and exchanges for access_token
↓
Backend stores token securely
↓
Frontend redirected to home page
```

## Error Handling

The implementation handles:

| Error | Message | Solution |
|-------|---------|----------|
| Missing FYERS_APP_ID | "Set VITE_FYERS_APP_ID before..." | Add app ID to env vars |
| Expired auth code | "Authorization code expired..." | Start OAuth flow again |
| Invalid auth code | "FYERS did not return auth code..." | Check FYERS OAuth URL |
| Missing FYERS_REDIRECT_URI | "FYERS_REDIRECT_URI must be configured..." | Set redirect URI in env |
| Network timeout | "Request to FYERS timed out" | Retry, check network |
| Invalid secrets | "FYERS_APP_ID/FYERS_SECRET_ID server secrets missing" | Set backend secrets |

## Testing the Flow

### Local Development

1. **Start backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Start frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Visit dashboard:**
   - Navigate to `http://localhost:5173`
   - Click "Connect FYERS Account"
   - You'll be redirected to FYERS OAuth
   - After authorization, you should return to the callback page
   - Then redirected to home

### Production Testing

1. Visit your Render frontend URL
2. Click "Connect FYERS Account"
3. Authorize with FYERS
4. Verify you're redirected back successfully

## Security Features

✅ **Secrets never exposed to frontend:**
- App ID hash computed server-side
- Secret key never sent to client
- Tokens stored only on backend

✅ **Auth code validation:**
- Format validation (alphanumeric)
- Length validation (prevents dummy codes)
- Timeout protection (10 second max)

✅ **Redirect loop prevention:**
- URL history replaced with `history.replaceState`
- No duplicate exchanges possible

✅ **Error handling:**
- Clear user-friendly messages
- Technical details in expandable sections
- No sensitive data in error logs

## Backward Compatibility

All existing functionality is **preserved**:
- Manual dev auth button still works (hidden by default)
- Legacy `/auth/callback` route still works
- All current trading features unchanged
- Database schema unchanged
- Existing APIs unchanged
- Websocket flows unchanged

Activate dev mode with: `?devAuth=1` URL parameter

## Token Storage

Tokens are stored in-memory on the backend using `fyersTokenStore.js`:

```javascript
// Retrieved automatically when needed
const token = getFyersAccessToken();
const appId = process.env.FYERS_APP_ID;

// Use with FYERS API
const response = await fetch(url, {
  headers: { Authorization: `${appId}:${token}` }
});
```

**Note:** In-memory storage resets on server restart. For production, consider:
- Database storage (encrypted)
- Session storage with encryption
- Secure token refresh logic

## Future Enhancements

These can be added without major refactoring:

- [ ] Token refresh mechanism (using refresh_token)
- [ ] Database storage for tokens
- [ ] Token expiration tracking
- [ ] Multiple account support
- [ ] Disconnect/re-authorize flow
- [ ] Token revocation on logout

## Troubleshooting

### "Set VITE_FYERS_APP_ID before..."
**Cause:** Frontend environment variable not set
**Fix:** Add VITE_FYERS_APP_ID to frontend `.env` file

### "FYERS_REDIRECT_URI must be configured..."
**Cause:** Backend environment variable not set
**Fix:** Add FYERS_REDIRECT_URI to backend `.env` file

### "FYERS did not return an auth code..."
**Cause:** FYERS redirect URL doesn't match configured URI
**Fix:** Ensure FYERS_REDIRECT_URI exactly matches FYERS app settings

### "Authorization code expired or invalid"
**Cause:** Auth code was already used or expired
**Fix:** Start the OAuth flow again (auth codes valid for ~10 mins)

### OAuth loop or 404 on callback
**Cause:** Render SPA not configured correctly
**Fix:** Ensure `_redirects` file in frontend public folder redirects `/callback` to index.html

## Support

For issues:
1. Check the error message in the callback page
2. Review browser console for additional details
3. Check backend server logs
4. Verify all environment variables are set correctly
5. Ensure FYERS app is configured with correct redirect URI
