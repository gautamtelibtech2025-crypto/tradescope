import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../utils/constants.dart';

class WebSocketService {
  WebSocketChannel? _channel;

  void connect(String userId, void Function(Map<String, dynamic>) onMessage) {
    final uri = Uri.parse('${AppConstants.websocketBaseUrl}/$userId');
    _channel = WebSocketChannel.connect(uri);
    _channel!.stream.listen((event) {
      final parsed = jsonDecode(event as String) as Map<String, dynamic>;
      onMessage(parsed);
    });
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
  }
}

