class AssistantRequest {
  final String userId;
  final String text;
  final Map<String, dynamic> context;

  AssistantRequest({required this.userId, required this.text, this.context = const {}});

  Map<String, dynamic> toJson() => {
        'user_id': userId,
        'text': text,
        'context': context,
      };
}

class AssistantResponse {
  final String text;
  final String intent;

  AssistantResponse({required this.text, required this.intent});

  factory AssistantResponse.fromJson(Map<String, dynamic> json) {
    return AssistantResponse(
      text: json['text']?.toString() ?? '',
      intent: (json['intent']?['intent'] ?? 'conversation').toString(),
    );
  }
}

