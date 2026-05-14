import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/assistant_provider.dart';
import '../services/permission_service.dart';
import '../widgets/assistant_orb.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final PermissionService _permissionService = PermissionService();

  @override
  void initState() {
    super.initState();
    _permissionService.requestCorePermissions();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(assistantProvider);
    final notifier = ref.read(assistantProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('AI Companion')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const SizedBox(height: 20),
            AssistantOrb(listening: state.listening),
            const SizedBox(height: 20),
            Text(
              state.assistantText,
              style: const TextStyle(fontSize: 17),
            ),
            const SizedBox(height: 12),
            Text(
              state.transcript,
              style: const TextStyle(fontSize: 14, color: Colors.white70),
            ),
            const Spacer(),
            ElevatedButton.icon(
              onPressed: state.listening ? notifier.stopListening : notifier.startListening,
              icon: Icon(state.listening ? Icons.stop : Icons.mic),
              label: Text(state.listening ? 'Stop Listening' : 'Push To Talk'),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

