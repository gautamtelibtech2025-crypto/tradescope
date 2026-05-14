class AppConstants {
  static const backendBaseUrl = String.fromEnvironment(
    'BACKEND_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000',
  );
  static const websocketBaseUrl = String.fromEnvironment(
    'WEBSOCKET_BASE_URL',
    defaultValue: 'ws://10.0.2.2:8000/ws/assistant',
  );
  static const defaultUserId = 'demo-user';
}

