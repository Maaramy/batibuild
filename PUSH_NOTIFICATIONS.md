# Push Notifications Android — batibuild

Module d'administration + intégration Firebase Cloud Messaging (FCM) réelle dans
l'application Android existante (`mobile/`, coque Expo + WebView).

## 1. Activer FCM (à faire une seule fois)

### Backend Convex (clé privée — jamais côté client)

Ajoutez **une** des configurations dans les variables d'environnement Convex :

| Variable | Description |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Contenu JSON complet du compte de service (recommandé) |
| `FIREBASE_SERVICE_ACCOUNT` | Alias du précédent |
| `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` | Variables séparées (`\n` acceptés dans la clé) |

Console Firebase → **Paramètres du projet → Comptes de service → Générer une
nouvelle clé privée**. Le rôle minimal est *Firebase Cloud Messaging API*.
Sans cette configuration, l'administration affiche une erreur explicite et
aucun envoi n'est effectué.

### Application Android

1. Console Firebase → ajouter l'application Android `com.batibuild.app`.
2. Télécharger `google-services.json` et le placer dans
   `mobile/android/app/google-services.json` (fichier ignoré par Git).
3. Reconstruire l'APK/AAB : `cd mobile && npm run android:apk`.

Tant que le fichier est absent, l'application compile et fonctionne
normalement, mais aucune notification ne peut être reçue : Gradle affiche
`🔕 google-services.json absent`.

### Ce qui est déjà implémenté côté Android

- SDK `firebase-messaging` + plugin Google Services conditionnel.
- `PushMessagingService` : token initial et rotations (`onNewToken`), réception
  au premier plan, service déclaré dans le manifeste pour l'arrière-plan et
  l'application fermée.
- Canal `batibuild_default` (importance haute), permission
  `POST_NOTIFICATIONS` demandée à l'exécution sur Android 13+.
- Module natif `BatibuildPush` : état (token, autorisation, appareil),
  rafraîchissement du token, réglages système, notification en attente.
- Le tap ouvre `MainActivity` (`singleTask`) avec la route interne et le jeton
  de suivi ; la WebView navigue vers la fonctionnalité ou vers
  `/auth?returnTo=…` si la session a expiré, puis revient à la destination.
- La plateforme Web enregistre le token auprès de Convex une fois connectée
  (`PushRegistration`), sans jamais exposer de clé Firebase.

## 2. Fonctionnement du module admin

Rubrique **Administrateur → Push**.

- **Tableau de bord** : envoyées (ciblées), acceptées par FCM, ouvertes,
  clics, taux d'ouverture, conversions, utilisateurs Android, utilisateurs
  ayant autorisé. Filtres par période, catégorie et campagne.
- **Modèles** : 15 modèles aux textes imposés (9 Client Pro dont l'offre
  personnalisée, 3 Experts, 3 Fournisseurs). « Utiliser » crée un brouillon
  modifiable.
- **Éditeur** : nom interne, catégorie, titre (≤ 65 caractères), message
  (≤ 180), image HTTPS, icône, bouton, destination, expiration, aperçu Android
  temps réel.
- **Ciblage** : 11 audiences, filtres inscription / dernière activité /
  forfait / état d'abonnement / région / module jamais utilisé, sélection
  individuelle, compteur exact avant envoi (plafond 5 000).
- **Campagnes** : brouillon, programmée, en cours, envoyée, suspendue, échec,
  annulée ; modifier, tester, envoyer, programmer, suspendre, annuler,
  supprimer, consulter le détail par destinataire.

## 3. Règles de sécurité

- Accès réservé au rôle `admin` (lecture et écriture).
- Aucun envoi aux utilisateurs `pushOptOut`, désactivés, membres du staff, ou
  dont l'autorisation système est refusée/retirée.
- Un seul token par utilisateur et par campagne (le plus récent) : aucun
  doublon, même avec plusieurs appareils.
- Tokens FCM invalides (`UNREGISTERED`, `INVALID_ARGUMENT`, `SENDER_ID_MISMATCH`,
  HTTP 404) automatiquement désactivés.
- Destinations limitées aux routes internes ou HTTPS ; `javascript:`, `data:`
  et les URL protocol-relative sont refusées.
- Jetons de suivi opaques (48 hex), jamais dérivés du token FCM.
- Envoi par lots de 20 toutes les 1,2 s, plafond 5 000 destinataires.
- Désabonnement : réglage **Paramètres → Notifications push** ou lien
  `/p/u?token=…`.

## 4. Mesures

- **Acceptées** : réponse HTTP 200 de FCM (aucune garantie d'affichage).
- **Ouvertes** : tap réel sur la notification, signalé par l'application.
- **Clics** : destination effectivement affichée (pas une simple réception).
- **Conversions** : clic vers un parcours monétisable (estimation, cotisation,
  mise en relation, plans, investissement, aide à la décision) ou évaluation.

Ces événements ne sont jamais inventés : sans signal de l'application, les
compteurs restent à zéro.

## 5. Vérification sur un appareil réel

1. Installer l'APK avec `google-services.json`.
2. Se connecter ; vérifier dans l'admin que l'utilisateur compte un appareil
   autorisé.
3. Créer une notification, « Envoyer un test » (appareil de l'admin).
4. Tester : application ouverte, en arrière-plan, fermée.
5. Toucher la notification : la bonne page doit s'ouvrir (ou `/auth` puis
   retour à la page après connexion).
6. Se déconnecter/reconnecter : le token reste associé au bon compte.
7. Refuser l'autorisation dans Android puis vérifier que l'audience l'exclut.
8. Programmer une campagne, la suspendre, l'annuler.
9. Vérifier le détail : acceptées / ouvertes / clics / conversions.
10. Désactiver les notifications depuis Paramètres : l'audience tombe à zéro
    pour cet utilisateur.

## 6. Limites connues

- L'image de notification en **premier plan** n'est pas affichée par la coque
  (Android l'affiche en arrière-plan / application fermée via le payload FCM).
- iOS n'est pas couvert par ce module (Android uniquement).
- Les ouvertures restent indicatives : Android ne fournit pas d'accusé de
  lecture système fiable.
- Le programme de parrainage n'existe pas encore dans la plateforme : les
  modèles de parrainage pointent provisoirement vers `/dashboard/pricing`.
