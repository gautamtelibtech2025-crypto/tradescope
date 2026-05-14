package com.example.ai_companion_flutter.assistant

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent

class AssistantAccessibilityService : AccessibilityService() {
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Hook for foreground app detection and proactive triggers.
    }

    override fun onInterrupt() {
    }
}

