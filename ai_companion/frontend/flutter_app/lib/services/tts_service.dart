import 'package:flutter_tts/flutter_tts.dart';

class TtsService {
  final FlutterTts _tts = FlutterTts();

  Future<void> init() async {
    await _tts.setLanguage('en-IN');
    await _tts.setSpeechRate(0.45);
  }

  Future<void> speak(String text) async {
    await _tts.speak(text);
  }
}

