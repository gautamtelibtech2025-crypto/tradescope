import 'package:speech_to_text/speech_to_text.dart';

class VoiceService {
  final SpeechToText _stt = SpeechToText();

  Future<bool> init() => _stt.initialize();

  void listen({
    required void Function(String text) onPartial,
    required void Function(String text) onFinal,
  }) {
    _stt.listen(
      localeId: 'en_IN',
      onResult: (result) {
        onPartial(result.recognizedWords);
        if (result.finalResult) {
          onFinal(result.recognizedWords);
        }
      },
    );
  }

  void stop() => _stt.stop();
}

