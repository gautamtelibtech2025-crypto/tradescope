import 'package:flutter/services.dart';

class DeviceControlService {
  static const _channel = MethodChannel('ai_companion/device_control');

  Future<void> openApp(String packageName) async {
    await _channel.invokeMethod('openApp', {'packageName': packageName});
  }

  Future<void> closeApp(String packageName) async {
    await _channel.invokeMethod('closeApp', {'packageName': packageName});
  }

  Future<void> playMedia() async {
    await _channel.invokeMethod('playMedia');
  }

  Future<void> pauseMedia() async {
    await _channel.invokeMethod('pauseMedia');
  }
}

