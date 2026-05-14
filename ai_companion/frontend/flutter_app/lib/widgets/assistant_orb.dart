import 'package:flutter/material.dart';

class AssistantOrb extends StatelessWidget {
  final bool listening;

  const AssistantOrb({super.key, required this.listening});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 280),
      width: listening ? 120 : 96,
      height: listening ? 120 : 96,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: listening
              ? [Colors.cyanAccent, Colors.blueAccent]
              : [Colors.blueGrey.shade700, Colors.blueGrey.shade900],
        ),
        boxShadow: [
          BoxShadow(
            color: listening ? Colors.cyanAccent.withOpacity(0.4) : Colors.transparent,
            blurRadius: 24,
            spreadRadius: 2,
          ),
        ],
      ),
      child: const Icon(Icons.graphic_eq, size: 42, color: Colors.white),
    );
  }
}

