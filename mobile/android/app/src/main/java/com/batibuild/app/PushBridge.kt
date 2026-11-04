package com.batibuild.app

import android.content.Intent

/**
 * Pont entre une notification FCM et la WebView batibuild.
 *
 * Quand l'utilisateur touche une notification, Android ouvre MainActivity avec
 * les données de la notification en extras. On les conserve ici jusqu'à ce que
 * la page Web les récupère (module natif `BatibuildPush.consumePendingUrl`),
 * puis la page navigue vers la destination et enregistre l'ouverture.
 *
 * Aucune donnée sensible : uniquement la route interne et le jeton opaque de
 * suivi généré par le backend pour cette notification.
 */
object PushBridge {
    private var pendingUrl: String? = null
    private var pendingLogToken: String? = null

    /**
     * Écouteur React Native : renseigné par `PushModule` quand l'application
     * tourne déjà. Une notification touchée est alors transmise immédiatement
     * à la page, sans recharger la WebView.
     */
    var listener: ((Map<String, String?>) -> Unit)? = null

    fun handleIntent(intent: Intent?) {
        val extras = intent?.extras ?: return
        // FCM place les clés `data` de la notification directement en extras.
        val url = extras.getString("url")
            ?: extras.getString("gcm.n.link_android")
            ?: extras.getString("link")
            ?: return
        if (url.isBlank()) return
        pendingUrl = url
        pendingLogToken = extras.getString("logToken")
        val emit = listener ?: return
        val pending = consume()
        // Consommée immédiatement : la page reçoit l'événement une seule fois.
        emit(pending)
    }

    fun consume(): Map<String, String?> {
        val url = pendingUrl
        val token = pendingLogToken
        pendingUrl = null
        pendingLogToken = null
        return mapOf("url" to url, "logToken" to token)
    }

    fun hasPending(): Boolean = pendingUrl != null
}
