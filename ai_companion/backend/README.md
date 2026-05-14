# AI Companion Backend (FastAPI)

Production-style modular backend for Android-first assistant:

- Voice pipeline (Whisper STT + ElevenLabs TTS hook)
- Deterministic intent routing for fast commands
- Action router and device command dispatch via WebSocket
- Reminder and memory APIs
- Browser automation module (Playwright)
- Conversation engine with OpenAI-compatible API

## Run locally

1. Create env:
   - copy `.env.example` to `.env`
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Create DB schema:
   - execute `database/schema.sql` on Supabase/PostgreSQL
4. Start API:
   - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

## Key endpoints

- `POST /api/v1/assistant/process`
- `POST /api/v1/voice/transcribe`
- `POST /api/v1/reminders`
- `GET /api/v1/memory/{user_id}`
- `GET /api/v1/permissions`
- `GET /api/v1/automation/search?query=...`
- `WS /ws/assistant/{user_id}`

