# TradeScope — Setup Guide

## Folder Structure
```
tradescope/
├── supabase/
│   └── functions/
│       ├── _shared/
│       │   ├── cors.ts
│       │   ├── fyers.ts
│       │   └── indicators.ts
│       ├── connect/index.ts
│       ├── symbols/index.ts
│       ├── scan-volume/index.ts
│       ├── scan-ema/index.ts
│       ├── scan-breakout/index.ts
│       ├── scan-rsi/index.ts
│       └── scan-combo/index.ts
├── tradescope-frontend.html
├── index.html
├── render.yaml
└── README.md
```

---

## Step 1 — Supabase Account

1. https://supabase.com pe jaao → free account banao
2. New Project create karo
3. Settings → API mein jaao:
   - **Project URL** copy karo → `https://xxxx.supabase.co`
   - **anon/public key** copy karo

---

## Step 2 — Supabase CLI Install

```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# npm (koi bhi platform)
npm install -g supabase
```

---

## Step 3 — Project Link Karo

```bash
# Login
supabase login

# Project folder mein jaao
cd tradescope

# Supabase se link karo (Project Ref Settings mein milega)
supabase link --project-ref YOUR_PROJECT_REF
```

---

## Step 4 — Functions Deploy Karo

```bash
supabase functions deploy connect
supabase functions deploy symbols
supabase functions deploy scan-volume
supabase functions deploy scan-ema
supabase functions deploy scan-breakout
supabase functions deploy scan-rsi
supabase functions deploy scan-pattern
supabase functions deploy scan-intraday
supabase functions deploy scan-combo
```

---

## Step 5 — Fyers API Setup

1. https://myapi.fyers.in pe jaao
2. Login karo
3. **Create App** karo:
   - App Name: TradeScope
   - Redirect URL: `http://127.0.0.1:17863/callback`
4. **App ID** mil jaayega (e.g. `XXXXX-100`)
5. Daily **Access Token** generate karo:
   - Fyers API docs follow karo ya
   - https://myapi.fyers.in/generate-authcode use karo

> ⚠️ Access Token roz expire hota hai. Lekin naye script flow me daily token type/paste nahi karna padega (auto-capture + auto secret update).

---

## Step 6 — Frontend Open Karo

```bash
# Bas file browser mein open karo
open tradescope-frontend.html
```

Ya VS Code mein **Live Server** extension se open karo.

---

## Step 8 — GitHub se Render pe Live Deploy (No Tunnel)

1. Is folder ko GitHub repo mein push karo (root mein `render.yaml` already added hai).
2. Render dashboard open karo: https://render.com
3. **New +** -> **Blueprint** select karo.
4. GitHub repo connect karo aur same repo choose karo.
5. Render `render.yaml` read karega aur static web service create karega.
6. Deploy complete hone ke baad Render URL milega (example: `https://tradescope-frontend.onrender.com`).
7. Live URL open karke Setup page mein:
   - Supabase URL daalo
   - Supabase publishable key daalo
   - Connect dabao

Notes:
- Tunnel ki zarurat nahi hai.
- `FYERS_APP_ID` aur `FYERS_ACCESS_TOKEN` sirf Supabase secrets mein rahenge (frontend mein nahi).
- Agar `tradescope-frontend.html` mein change karo, bas Git push karo; Render auto redeploy karega.

### Daily Auto Launch (Optional but Recommended)

Agar aap admin bhi ho aur customer bhi, to daily token refresh yaad rakhna avoid karne ke liye scheduler set karo:

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\create-fyers-refresh-task.ps1 -Time 08:45
```

Isse daily specified time par token script auto-launch hoga. Aapko bas FYERS login complete karna hoga.

---

## Step 7 — App Connect Karo

App mein jaao -> Setup page:
- **Supabase URL**: `https://xxxx.supabase.co`
- **Supabase Anon Key**: Settings se copy kiya hua

Connect button dabao -> ho gaya! 🎉

Important:
- Default mode: Fyers App ID aur Fyers Access Token frontend me enter mat karo (server secret mode best hai).
- Optional backup mode: Setup page me "Generate Access Token" button aur manual override fields available hain.
- Agar server token expire ho jaye, to admin manual override use karke turant app chala sakta hai.

---

## Rate Limits

| Limit | Value |
|---|---|
| Fyers API | ~200 req/min |
| Supabase Edge Functions (free) | 500K req/month |
| Scan speed | ~100 stocks in 30-60 sec |

---

## Troubleshooting

**"Invalid credentials"** → Fyers token expire ho gaya, naya generate karo

**"Function not found"** → `supabase functions deploy` dobara run karo

**Symbols nahi aa rahi** → Exchange NSE rakho, Fyers public CSV accessible hona chahiye

**Scan bahut slow hai** → Limit kam karo (200 ke bajaye 100 stocks)
