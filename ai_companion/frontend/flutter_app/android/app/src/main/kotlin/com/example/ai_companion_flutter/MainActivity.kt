package com.example.ai_companion_flutter

import android.content.Intent
import android.media.AudioManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channel = "ai_companion/device_control"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channel).setMethodCallHandler { call, result ->
            when (call.method) {
                "openApp" -> {
                    val packageName = call.argument<String>("packageName")
                    if (packageName.isNullOrBlank()) {
                        result.error("INVALID", "packageName missing", null)
                        return@setMethodCallHandler
                    }
                    val launchIntent: Intent? = packageManager.getLaunchIntentForPackage(packageName)
                    if (launchIntent == null) {
                        result.error("NOT_FOUND", "App not installed", null)
                        return@setMethodCallHandler
                    }
                    startActivity(launchIntent)
                    result.success(true)
                }
                "closeApp" -> {
                    result.error("UNSUPPORTED", "Direct app closing is restricted on Android", null)
                }
                "playMedia" -> {
                    val am = getSystemService(AUDIO_SERVICE) as AudioManager
                    am.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_MEDIA_PLAY))
                    result.success(true)
                }
                "pauseMedia" -> {
                    val am = getSystemService(AUDIO_SERVICE) as AudioManager
                    am.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_MEDIA_PAUSE))
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }
}

