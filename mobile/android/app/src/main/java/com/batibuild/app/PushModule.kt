package com.batibuild.app

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.PermissionAwareActivity
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging

/**
 * Module natif exposé à React Native sous le nom `BatibuildPush`.
 *
 * La page Web ne parle jamais directement au module : la coque RN lit l'état
 * (token, autorisation, identifiant d'appareil) et l'injecte dans la WebView
 * (`window.__BATIBUILD_PUSH__`). Le token n'est donc jamais placé dans l'URL.
 */
class PushModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val prefs
        get() = reactContext.getSharedPreferences(PushMessagingService.PREFS, Context.MODE_PRIVATE)

    init {
        // Notification touchée pendant que l'application est ouverte :
        // transmise à React Native sans recharger la WebView.
        PushBridge.listener = { pending ->
            try {
                val payload = Arguments.createMap().apply {
                    putString("url", pending["url"])
                    putString("logToken", pending["logToken"])
                }
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("BatibuildPushOpen", payload)
            } catch (_: Exception) {
                // Pont indisponible : la page récupérera la notification plus tard.
            }
        }
    }

    override fun invalidate() {
        PushBridge.listener = null
        super.invalidate()
    }

    override fun getName() = "BatibuildPush"

    private fun permissionStatus(): String {
        val enabled = NotificationManagerCompat.from(reactContext).areNotificationsEnabled()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                reactContext,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) return if (prefs.getBoolean(KEY_ASKED, false)) "denied" else "default"
        }
        return if (enabled) "granted" else "denied"
    }

    private fun deviceId(): String? = try {
        Settings.Secure.getString(reactContext.contentResolver, Settings.Secure.ANDROID_ID)
    } catch (_: Exception) {
        null
    }

    @ReactMethod
    fun getState(promise: Promise) {
        val configured = try {
            FirebaseApp.getApps(reactContext).isNotEmpty()
        } catch (_: Exception) {
            false
        }
        val result = Arguments.createMap().apply {
            putString("token", prefs.getString(PushMessagingService.KEY_TOKEN, null))
            putString("permission", permissionStatus())
            putString("deviceId", deviceId())
            putString("platform", "android")
            // Sans google-services.json/Firebase, inutile de demander l'autorisation.
            putBoolean("configured", configured)
        }
        promise.resolve(result)
    }

    /** Récupère le token FCM courant auprès de Firebase (ou null si non configuré). */
    @ReactMethod
    fun fetchToken(promise: Promise) {
        try {
            if (FirebaseApp.getApps(reactContext).isEmpty()) {
                promise.resolve(null)
                return
            }
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    promise.resolve(null)
                    return@addOnCompleteListener
                }
                val token = task.result
                prefs.edit().putString(PushMessagingService.KEY_TOKEN, token).apply()
                promise.resolve(token)
            }
        } catch (_: Exception) {
            promise.resolve(null)
        }
    }

    /** Demande l'autorisation Android 13+ (no-op sur les versions antérieures). */
    @ReactMethod
    fun requestPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            promise.resolve(permissionStatus())
            return
        }
        if (permissionStatus() == "granted") {
            promise.resolve("granted")
            return
        }
        val activity = currentActivity
        if (activity is PermissionAwareActivity) {
            activity.requestPermissions(
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                REQUEST_NOTIFICATIONS,
            ) { _, _, _ ->
                prefs.edit().putBoolean(KEY_ASKED, true).apply()
                promise.resolve(permissionStatus())
                true
            }
        } else {
            promise.resolve(permissionStatus())
        }
    }

    /** Route + jeton de la notification qui a ouvert l'application (si présente). */
    @ReactMethod
    fun consumePendingUrl(promise: Promise) {
        val pending = PushBridge.consume()
        val result = Arguments.createMap().apply {
            putString("url", pending["url"])
            putString("logToken", pending["logToken"])
        }
        promise.resolve(result)
    }

    /** Ouvre les réglages système de notifications de l'application. */
    @ReactMethod
    fun openNotificationSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (_: Exception) {
            promise.resolve(false)
        }
    }

    companion object {
        private const val KEY_ASKED = "permission_asked"
        private const val REQUEST_NOTIFICATIONS = 4801
    }
}
