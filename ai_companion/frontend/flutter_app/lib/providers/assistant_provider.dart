import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/assistant_models.dart';
import '../services/api_service.dart';
import '../services/device_control_service.dart';
import '../services/tts_service.dart';
import '../services/voice_service.dart';
import '../services/websocket_service.dart';
import '../utils/constants.dart';

final assistantProvider = StateNotifierProvider<AssistantNotifier, AssistantState>(
  (ref) => AssistantNotifier(),
);

class AssistantState {
  final bool listening;
  final String transcript;
  final String assistantText;

  const AssistantState({
    this.listening = false,
    this.transcript = '',
    this.assistantText = 'Ready. Tap mic and speak.',
  });

  AssistantState copyWith({bool? listening, String? transcript, String? assistantText}) {
    return AssistantState(
      listening: listening ?? this.listening,
      transcript: transcript ?? this.transcript,
      assistantText: assistantText ?? this.assistantText,
    );
  }
}

class AssistantNotifier extends StateNotifier<AssistantState> {
  AssistantNotifier() : super(const AssistantState()) {
    _setup();
  }

  final ApiService _api = ApiService();
  final VoiceService _voice = VoiceService();
  final TtsService _tts = TtsService();
  final WebSocketService _ws = WebSocketService();
  final DeviceControlService _deviceControl = DeviceControlService();

  Future<void> _setup() async {
    await _voice.init();
    await _tts.init();
    _ws.connect(AppConstants.defaultUserId, _handleWsMessage);
  }

  void startListening() {
    state = state.copyWith(listening: true, transcript: '');
    _voice.listen(
      onPartial: (text) => state = state.copyWith(transcript: text),
      onFinal: (text) async => _processText(text),
    );
  }

  void stopListening() {
    _voice.stop();
    state = state.copyWith(listening: false);
  }

  Future<void> _processText(String text) async {
    state = state.copyWith(transcript: text, assistantText: 'Thinking...');
    final response = await _api.processAssistantRequest(
      AssistantRequest(userId: AppConstants.defaultUserId, text: text),
    );
    state = state.copyWith(listening: false, assistantText: response.text);
    await _tts.speak(response.text);
  }

  Future<void> _handleWsMessage(Map<String, dynamic> message) async {
    if (message['channel'] != 'device_command') return;
    final payload = message['payload'] as Map<String, dynamic>;
    switch (payload['type']) {
      case 'open_app':
        await _deviceControl.openApp(payload['app_name'].toString());
        break;
      case 'close_app':
        await _deviceControl.closeApp(payload['app_name'].toString());
        break;
      case 'media_play':
        await _deviceControl.playMedia();
        break;
      case 'media_pause':
        await _deviceControl.pauseMedia();
        break;
    }
  }
}

