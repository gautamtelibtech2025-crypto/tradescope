import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'screens/home_screen.dart';

void main() {
  runApp(const ProviderScope(child: AiCompanionApp()));
}

class AiCompanionApp extends StatelessWidget {
  const AiCompanionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'AI Companion',
      theme: ThemeData.dark(useMaterial3: true).copyWith(
        scaffoldBackgroundColor: const Color(0xFF0D1117),
        colorScheme: const ColorScheme.dark(
          primary: Colors.cyanAccent,
          secondary: Colors.blueAccent,
        ),
      ),
      home: const HomeScreen(),
    );
  }
}

