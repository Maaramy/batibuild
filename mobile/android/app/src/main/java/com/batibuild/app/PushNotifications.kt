package com.batibuild.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Affichage natif des notifications reçues en PREMIER PLAN.
 *
 * En arrière-plan / application fermée, Firebase affiche lui-même la
 * notification (`notification` payload) en utilisant le canal par défaut
 * déclaré dans le manifeste. En premier plan, `onMessageReceived` est appelé :
 * on construit alors la même notification pour un comportement identique.
 *
 * Le tap ouvre MainActivity avec la destination et le jeton de suivi : la page
 * Web navigue vers la bonne fonctionnalité (ou vers /auth puis revient).
 */
object PushNotifications {
    const val CHANNEL_ID = "batibuild_default"
    private const val CHANNEL_NAME = "Notifications batibuild"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Offres, conseils construction et actualités batibuild"
            enableVibration(true)
        }
        manager.createNotificationChannel(channel)
    }

    fun show(context: Context, title: String, body: String, data: Map<String, String>) {
        if (title.isBlank() && body.isBlank()) return
        ensureChannel(context)

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            data.forEach { (key, value) ->
                if (key == "url" || key == "logToken" || key == "campaignId") putExtra(key, value)
            }
        }

        val pending = PendingIntent.getActivity(
            context,
            (data["logId"] ?: System.currentTimeMillis().toString()).hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_batibuild)
            .setContentTitle(title.ifBlank { "batibuild" })
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(
                (data["logId"] ?: System.currentTimeMillis().toString()).hashCode(),
                notification,
            )
        } catch (_: SecurityException) {
            // Autorisation refusée : rien à afficher, aucun crash.
        }
    }
}
