import 'package:dio/dio.dart';

import '../models/assistant_models.dart';
import '../utils/constants.dart';

class ApiService {
  final Dio _dio = Dio(BaseOptions(baseUrl: AppConstants.backendBaseUrl));

  Future<AssistantResponse> processAssistantRequest(AssistantRequest request) async {
    final response = await _dio.post('/api/v1/assistant/process', data: request.toJson());
    return AssistantResponse.fromJson(response.data as Map<String, dynamic>);
  }
}

