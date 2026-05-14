# AI Companion Assistant (Android-first MVP)

This is a production-style modular scaffold for a proactive AI companion assistant inspired by Jarvis/Nova patterns, focused on reliability and low-latency command execution.

## Included deliverables

1. Full production-style folder structure (`backend` + `frontend/flutter_app`)
2. FastAPI backend with modular services
3. Flutter frontend implementation (Riverpod)
4. WebSocket implementation for realtime commands/state
5. Android permission + accessibility/notification setup
6. Deterministic intent detection engine
7. Reminder engine
8. Voice pipeline (STT + assistant processing + TTS hook)
9. Action router
10. Device control bridge (MethodChannel + backend command dispatch)
11. Browser automation module (Playwright)
12. Database schema (`backend/database/schema.sql`)
13. Setup instructions
14. Environment variable examples (`backend/.env.example`)
15. Local development guide

## Folder structure

```text
ai_companion/
  backend/
    app/
      api/
      ai/
      voice/
      memory/
      actions/
      automation/
      reminders/
      suggestions/
      websocket/
      models/
      services/
      permissions/
      notifications/
      utils/
    database/
    requirements.txt
    .env.example
  frontend/
    flutter_app/
      lib/
        screens/
        widgets/
        providers/
        services/
        models/
        utils/
```

## Architecture flow

Voice input -> STT -> Intent Detector -> Action Router (or Conversation Engine) -> Memory update -> TTS -> Audio playback.

## Local development

### 1. Backend

1. `cd ai_companion/backend`
2. `python -m venv .venv`
3. Activate venv
4. `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and fill keys
6. Run SQL in `database/schema.sql` on Supabase/Postgres
7. `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

### 2. Flutter app

1. `cd ai_companion/frontend/flutter_app`
2. `flutter pub get`
3. Set backend URL in `lib/utils/constants.dart`
4. `flutter run`

### 3. WebSocket test

- Connect app to `ws://<backend>/ws/assistant/{user_id}`
- Assistant API sends device commands via this channel.

## Phase-1 implemented first

- Push-to-talk microphone and TTS playback
- Deterministic voice command intent routing
- Open/close app hooks + media control hooks
- Reminder scheduling event dispatch
- Basic memory persistence and conversational fallback

## Next build sequence

1. Production-grade Android device control implementations per command type
2. Continuous listening mode with hotword + battery-aware policies
3. Advanced suggestions and habit memory retrieval ranking
4. Hardened browser automation workflows and safety constraints
5. Desktop adapter layer for Windows client

