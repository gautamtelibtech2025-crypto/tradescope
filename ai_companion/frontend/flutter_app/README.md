# AI Companion Flutter App

Android-first mobile client for voice-first AI companion.

## MVP included

- Push-to-talk microphone flow
- Voice transcription using native speech package
- Backend assistant processing
- TTS playback
- WebSocket command bridge for device actions
- Dark mode home experience
- Android permission + accessibility/notification service wiring

## Run

1. Install Flutter SDK and Android Studio.
2. From this directory: `flutter pub get`
3. Run on emulator/device:
   - `flutter run --dart-define=BACKEND_BASE_URL=http://10.0.2.2:8000 --dart-define=WEBSOCKET_BASE_URL=ws://10.0.2.2:8000/ws/assistant`

