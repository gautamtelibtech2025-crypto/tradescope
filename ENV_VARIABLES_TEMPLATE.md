# Environment Variable Templates

Copy and paste these templates to set up your environment variables.

## Frontend `.env` Template

### For Local Development
```env
# VITE Frontend Environment Variables

# FYERS OAuth Configuration
VITE_FYERS_APP_ID=your_fyers_app_id_here
VITE_FYERS_REDIRECT_URI=http://localhost:5173/callback

# Backend API Configuration
VITE_API_BASE_URL=http://localhost:10000
```

### For Render Production
```env
# VITE Frontend Environment Variables

# FYERS OAuth Configuration
VITE_FYERS_APP_ID=your_fyers_app_id_here
VITE_FYERS_REDIRECT_URI=https://tradescope-frontend.onrender.com/callback

# Backend API Configuration (use your actual Render backend URL)
VITE_API_BASE_URL=https://tradescope-backend.onrender.com
```

**How to use:**
1. Create file: `frontend/.env`
2. Copy template above
3. Replace placeholders with your values
4. Save file
5. Restart dev server or redeploy

---

## Backend `.env` Template

### For Local Development
```env
# Node.js Backend Environment Variables

# FYERS Credentials (REQUIRED for OAuth)
FYERS_APP_ID=your_fyers_app_id_here
FYERS_SECRET_ID=your_fyers_secret_key_here
FYERS_REDIRECT_URI=http://localhost:5173/callback

# Frontend Configuration
FRONTEND_ORIGIN=http://localhost:5173

# Server Configuration
PORT=10000
NODE_ENV=development
```

### For Render Production
```env
# Node.js Backend Environment Variables

# FYERS Credentials (REQUIRED for OAuth)
FYERS_APP_ID=your_fyers_app_id_here
FYERS_SECRET_ID=your_fyers_secret_key_here
FYERS_REDIRECT_URI=https://tradescope-frontend.onrender.com/callback

# Frontend Configuration
FRONTEND_ORIGIN=https://tradescope-frontend.onrender.com

# Server Configuration
PORT=10000
NODE_ENV=production
```

**How to use:**
1. Create file: `backend/.env`
2. Copy template above
3. Replace placeholders with your values
4. Save file
5. Restart dev server or redeploy

---

## Render Dashboard Setup

### For Frontend Service
Go to: **Dashboard** → **Environment**

Add these variables:
```
VITE_FYERS_APP_ID             = your_fyers_app_id
VITE_FYERS_REDIRECT_URI       = https://tradescope-frontend.onrender.com/callback
VITE_API_BASE_URL             = https://tradescope-backend.onrender.com
```

Then click **"Save Changes"** and **"Redeploy"**

### For Backend Service
Go to: **Dashboard** → **Environment**

Add these variables:
```
FYERS_APP_ID                  = your_fyers_app_id
FYERS_SECRET_ID               = your_fyers_secret_key
FYERS_REDIRECT_URI            = https://tradescope-frontend.onrender.com/callback
FRONTEND_ORIGIN               = https://tradescope-frontend.onrender.com
PORT                          = 10000
```

Then click **"Save Changes"** and **"Redeploy"**

---

## Supabase Secrets (if using Edge Functions)

Run in Supabase CLI:
```bash
# Set secrets
supabase secrets set FYERS_APP_ID "your_fyers_app_id"
supabase secrets set FYERS_SECRET_ID "your_fyers_secret_key"

# Verify secrets are set
supabase secrets list

# Deploy Edge Functions
supabase functions deploy fyers-token
```

---

## Getting Your Values

### FYERS_APP_ID
1. Go to: https://developer.fyers.in
2. Log in to your account
3. Go to Applications
4. Click on your application
5. Copy the **App ID**

### FYERS_SECRET_ID (Secret Key)
1. Go to: https://developer.fyers.in
2. Log in to your account
3. Go to Applications
4. Click on your application
5. Copy the **Secret Key** (keep this SECRET!)

### FYERS_REDIRECT_URI (must be set in FYERS app config)
Must match exactly in FYERS Developer Portal:
- **Local Dev:** `http://localhost:5173/callback`
- **Production:** `https://tradescope-frontend.onrender.com/callback`

To set in FYERS:
1. Go to: https://developer.fyers.in
2. Log in to your account
3. Go to Applications → Your App
4. Find "Redirect URIs" section
5. Add both (for development and production):
   - `http://localhost:5173/callback`
   - `https://tradescope-frontend.onrender.com/callback`
6. Save

---

## Verification Checklist

### Frontend .env
```bash
# Check that file exists
ls frontend/.env

# Verify contents (should have these keys)
grep VITE_FYERS_APP_ID frontend/.env
grep VITE_FYERS_REDIRECT_URI frontend/.env
grep VITE_API_BASE_URL frontend/.env
```

### Backend .env
```bash
# Check that file exists
ls backend/.env

# Verify contents (should have these keys)
grep FYERS_APP_ID backend/.env
grep FYERS_SECRET_ID backend/.env
grep FYERS_REDIRECT_URI backend/.env
grep FRONTEND_ORIGIN backend/.env
```

### Environment Variables are Set
```bash
# Verify backend vars are loaded
cd backend && npm run dev
# Look for: "TradeScope backend listening on 10000"

# Verify frontend vars are available
cd frontend && npm run dev
# Visit http://localhost:5173 and open console
# Check there are no "undefined VITE_" errors
```

---

## Sensitive Information ⚠️

**Never commit these files to git:**
```bash
# Add to .gitignore
frontend/.env
frontend/.env.local
backend/.env
backend/.env.local
```

**Never share these values:**
- FYERS_SECRET_ID
- FYERS_APP_ID (once published)
- FRONTEND_ORIGIN (production URLs)

**Rotate secrets if compromised:**
1. Go to FYERS Developer Portal
2. Regenerate your Secret Key
3. Update environment variables
4. Redeploy applications

---

## Troubleshooting

### "VITE_FYERS_APP_ID is undefined"
- Check `frontend/.env` exists
- Check it has `VITE_FYERS_APP_ID=...`
- Restart frontend dev server
- Check frontend console in browser

### "FYERS_APP_ID is not configured"
- Check `backend/.env` exists
- Check it has `FYERS_APP_ID=...`
- Restart backend server
- Check backend console output

### "Invalid redirect URI"
- Check `FYERS_REDIRECT_URI` in backend .env
- Check it matches FYERS app configuration
- Check for typos (case-sensitive, no trailing slashes)

### "CORS error in browser"
- Check `FRONTEND_ORIGIN` matches frontend URL
- Check `VITE_API_BASE_URL` is correct backend URL
- Verify backend CORS configuration

---

## Quick Commands

### Local Development Setup
```bash
# 1. Create frontend .env
cat > frontend/.env << EOF
VITE_FYERS_APP_ID=your_value
VITE_FYERS_REDIRECT_URI=http://localhost:5173/callback
VITE_API_BASE_URL=http://localhost:10000
EOF

# 2. Create backend .env
cat > backend/.env << EOF
FYERS_APP_ID=your_value
FYERS_SECRET_ID=your_value
FYERS_REDIRECT_URI=http://localhost:5173/callback
FRONTEND_ORIGIN=http://localhost:5173
PORT=10000
EOF

# 3. Start backend
cd backend && npm install && npm run dev

# 4. Start frontend (new terminal)
cd frontend && npm install && npm run dev

# 5. Visit
# http://localhost:5173
```

### Production Deployment Checklist
```bash
# 1. Build frontend
cd frontend && npm run build

# 2. Build backend (if needed)
cd backend && npm install --production

# 3. Verify builds succeeded
ls frontend/dist/index.html
ls backend/src/server.js

# 4. In Render dashboard:
#    - Frontend service: add env vars and redeploy
#    - Backend service: add env vars and redeploy

# 5. Test production
#    - Visit https://tradescope-frontend.onrender.com
#    - Click "Connect FYERS Account"
#    - Complete OAuth flow
```

---

## Need Help?

1. Check FYERS_OAUTH_SETUP.md for detailed setup guide
2. Check OAUTH_IMPLEMENTATION_CHECKLIST.md for deployment steps
3. Check OAUTH_INTEGRATION_GUIDE.md for implementation details
4. Review FYERS Developer Portal documentation

---

**Pro Tip:** Use `.env` for local development and Render Dashboard for production. Never put secrets in code! 🔐
