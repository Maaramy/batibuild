package com.batibuild.app

import android.content.Context
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Service Firebase Cloud Messaging de l'application batibuild.
 *
 * · `onNewToken` : conserve le token FCM courant (rotation automatique) ; il
 *   est transmis à la plateforme dès que l'utilisateur est connecté.
 * · `onMessageReceived` : appelé lorsque l'application est au premier plan
 *   (en arrière-plan, Firebase affiche la notification système lui-même).
 *
 * Aucune fonctionnalité existante n'est modifiée : le service ne fait que
 * publier une notification et mémoriser le token.
 */
class PushMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TOKEN, token)
            .apply()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val title = message.notification?.title ?: data["title"] ?: ""
        val body = message.notification?.body ?: data["body"] ?: ""
        PushNotifications.show(applicationContext, title, body, data)
    }

    companion object {
        const val PREFS = "batibuild_push"
        const val KEY_TOKEN = "fcm_token"
    }
}
