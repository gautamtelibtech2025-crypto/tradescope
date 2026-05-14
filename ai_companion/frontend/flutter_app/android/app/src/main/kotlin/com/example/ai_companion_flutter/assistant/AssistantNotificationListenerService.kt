package com.example.ai_companion_flutter.assistant

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class AssistantNotificationListenerService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        // Hook for notification summarization and read-out.
    }
}

