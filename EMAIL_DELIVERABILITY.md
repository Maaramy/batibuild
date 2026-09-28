# Délivrabilité e-mail — batibuild

Guide pour que les e-mails envoyés par le serveur SMTP arrivent dans la
**boîte de réception** (et non dans le courrier indésirable / Spam).

Le code d'envoi (`src/convex/emailSender.ts`) applique automatiquement :

- **Message-ID** au domaine de l'expéditeur (au lieu du nom d'hôte du serveur) ;
- En-têtes transactionnels : `Auto-Submitted: auto-generated`,
  `X-Auto-Response-Suppress: All`, priorité normale (jamais urgente) ;
- **Version texte brute** dérivée du HTML (ratio texte/HTML demandé par les
  filtres) ;
- **STARTTLS obligatoire** sur 587 et vérification des certificats activée par
  défaut ;
- **Signature DKIM** automatique dès que les variables `SMTP_DKIM_*` sont
définies — produite côté serveur uniquement, jamais dans le navigateur.

---

## 1. Variables d'environnement (onglet Keys/API keys)

```
SMTP_HOST=smtp.votre-hebergeur.tn
SMTP_PORT=587
SMTP_USER=noreply@votredomaine.tn
SMTP_PASSWORD=********
SMTP_FROM=noreply@votredomaine.tn
SMTP_FROM_NAME=batibuild
SMTP_SECURE=false
SMTP_TLS_VERIFY=true
```

| Variable | Rôle |
|---|---|
| `SMTP_HOST` / `SMTP_PORT` | Serveur SMTP (587 + STARTTLS, ou 465 + SSL direct) |
| `SMTP_USER` / `SMTP_PASSWORD` | Compte d'authentification SMTP |
| `SMTP_FROM` | Adresse **From + Reply-To**. **Doit être sur votre propre domaine**, pas un compte Gmail/Outlook/Yahoo/… |
| `SMTP_FROM_NAME` | Nom affiché (ex. batibuild) |
| `SMTP_SECURE` | `true` / `465` → SSL direct (port 465) ; `false` / `587` → STARTTLS |
| `SMTP_TLS_VERIFY` | `true` (défaut) : vérifie les certificats TLS. Mettre `false` uniquement pour un serveur auto-signé en interne |
| `SMTP_DKIM_DOMAIN` | Domaine signé DKIM — pour la plateforme : `batibuild.app` (voir ci-dessous) |
| `SMTP_DKIM_SELECTOR` | Sélecteur DKIM fourni par l'hébergeur (défaut `default`) |
| `SMTP_DKIM_PRIVATE_KEY` | Clé privée DKIM fournie par l'hébergeur (PEM, peut être collée avec `\n`) |
| `APP_SENDING_DOMAIN` | Domaine d'envoi attendu (défaut `batibuild.app`) — sert au contrôle « domaine d'expédition « de l'admin |

### DKIM : serveur uniquement

La signature DKIM est produite **exclusivement côté serveur**, dans les actions
Node de Convex (`src/convex/dkim.ts`, appelé par `src/convex/emailSender.ts`) :

- `SMTP_DKIM_PRIVATE_KEY` n'est lue que dans ce module serveur ;
- la clé n'est **jamais** journalisée, renvoyée par une action, exposée au
  navigateur ni committée dans le dépôt (elle vit dans les secrets Convex) ;
- le frontend ne connaît que des **booléens** (DKIM configuré ou non, signature
  vérifiée ou non) et des **noms d'enregistrements DNS** — jamais la clé.

La présence des variables ne suffit pas à déclarer DKIM actif : l'application
compile un message avec le **même moteur d'envoi** et vérifie que l'en-tête
`DKIM-Signature` est réellement produit avec le bon domaine (`d=`) et le bon
sélecteur (`s=`), puis compare la clé publique publiée en DNS (`p=`) à la clé
privée qui signe. Sans ces deux contrôles, DKIM est signalé comme
« Non configuré » ou en échec.

### Règle d'or

`SMTP_FROM` et `SMTP_USER` doivent être sur **le même domaine**. Si le compte
SMTP est `noreply@hebergeur.tn` mais que les e-mails partent de
`contact@votredomaine.tn`, l'alignement SPF/DMARC échoue et Gmail/Outlook
classent le message en spam (impersonation).

---

## 2. Enregistrements DNS à ajouter (chez votre registrar)

### 2.1 SPF (autorise le serveur d'envoi)

```
Type : TXT
Nom  : @  (ou votredomaine.tn)
Valeur : v=spf1 include:VOTRE_HEBERGEUR ~all
```

- `VOTRE_HEBERGEUR` = valeur fournie par votre serveur SMTP
  (ex. `spf.ovh.net`, `spf.mailjet.com`, `aspmx.pardot.com`…). Si le serveur
  SMTP est l'hébergeur du domaine lui-même, `v=spf1 a mx ~all` suffit.
- Terminez **toujours** par `~all` ou `-all`, jamais `+all`.
- Un seul enregistrement SPF par domaine.

### 2.2 DKIM (signature cryptographique — le levier n°1 anti-spam)

1. Activez la signature DKIM dans le panneau de votre hébergeur SMTP ;
2. Récupérez **clé publique** (à publier en DNS) et **clé privée** (à coller
   dans la variable `SMTP_DKIM_PRIVATE_KEY`) ;
3. Publiez l'enregistrement TXT demandé, généralement :

```
Type : TXT
Nom  : <sélecteur>._domainkey
Valeur : k=rsa; p=<clé publique>
```

4. Renseignez dans l'application :

```
SMTP_DKIM_DOMAIN=votredomaine.tn
SMTP_DKIM_SELECTOR=<sélecteur>
SMTP_DKIM_PRIVATE_KEY=<clé privée PEM>
```

Le code signe alors **chaque e-mail envoyé** (codes de vérification, test,
notifications).

### 2.3 DMARC (politique de réception)

La politique reste volontairement en **`p=none` pendant la phase de
validation** : aucun e-mail légitime n'est bloqué et les rapports agrégés
montrent si SPF et DKIM passent partout.

```
Type : TXT
Nom  : _dmarc
Valeur : v=DMARC1; p=none; rua=mailto:dmarc@batibuild.app; ruf=mailto:dmarc@batibuild.app; fo=1; pct=100
```

Durcissement progressif (à faire **manuellement** chez le registrar —
l'application ne modifie jamais la politique DNS) :

1. `p=none` (phase de validation, politique actuelle) : on observe les rapports ;
2. après 1 à 2 semaines sans faux positif : `p=quarantine` — les e-mails non
   authentifiés partent en indésirables ;
3. une fois cette étape stable : `p=reject` — les e-mails non authentifiés sont
   refusés.

À chaque étape, conservez `rua=` (rapports agrégés) et `ruf=` (rapports d'échec)
pour détecter toute régression SPF/DKIM avant de durcir davantage.

### 2.4 MX (le domaine doit pouvoir recevoir du courrier)

Un domaine d'expéditeur sans enregistrement MX est considéré comme non
légitime. Si vous n'utilisez pas de boîte mail sur le domaine, ajoutez au
minimum un MX vers votre hébergeur e-mail.

---

## 3. Vérifier dans l'application

Administration → **E-mail** → **« Authentification e-mail (SPF · DKIM ·
DMARC) »** → bouton **« Vérifier la délivrabilité »**.

Le panneau affiche, pour le domaine d'expédition réellement utilisé :

| Ligne | Statut affiché | Ce qui est réellement contrôlé |
|---|---|---|
| Domaine d'envoi | OK / À vérifier | `SMTP_FROM` est bien sur `batibuild.app` |
| MX | OK / Échec | le domaine peut recevoir du courrier |
| SPF | OK / Échec | enregistrement TXT `v=spf1 …` (et pas de `+all`) |
| DKIM | **OK / Non configuré** / Échec | variables présentes **et** signature `DKIM-Signature` réellement produite **et** enregistrement `<sélecteur>._domainkey.<domaine>` publié **et** clé publique alignée sur la clé de signature |
| DMARC | **OK · politique actuelle : p=…** / Échec | enregistrement `_dmarc` présent et politique lisible |
| Alignement SPF/DKIM/DMARC | OK / À vérifier | domaine du compte SMTP = domaine de l'expéditeur |

Un bloc « Durcissement DMARC » liste les valeurs exactes des étapes
`p=quarantine` puis `p=reject`, en indiquant laquelle est active — aucune n'est
appliquée automatiquement.

Le test d'envoi réel (**« Tester la configuration SMTP »**) indique également si
la signature DKIM a été appliquée à l'e-mail de test. Côté destinataire, vérifiez
les en-têtes `Received-SPF: pass`, `dkim=pass` et `dmarc=pass`.

Aucune erreur technique brute n'est jamais renvoyée au navigateur, et la clé
privée DKIM n'apparaît dans aucune de ces réponses.

---

## 4. Bonnes pratiques de réputation

1. **Nouveau domaine / nouvelle adresse** : commencez par de petits volumes
   (quelques dizaines/jour) et augmentez progressivement (warm-up), sinon les
   gros fournisseurs throttlent ou classent en spam.
2. **Ne jamais envoyer depuis un compte gratuit** (gmail.com, outlook.com,
   hotmail.com, yahoo.fr, free.fr, orange.fr…) : SPF/DKIM absents ou partagés,
   taux de spam très élevé.
3. **Contenu sobre** : pas d'emoji dans les objets, pas de mots promotionnels
   (gratuit, urgent, 100 % gagné…), pas de lien de tracking externe, pas
   d'image unique (ratio texte/HTML).
4. **Surveillez les plaintes** : si des destinataires marquent vos e-mails
   comme spam, la réputation du domaine chute. Utilisez le retour DMARC
   (`rua=`) pour surveiller les tentatives d'usurpation.
5. **Expéditeur stable** : gardez la même adresse `SMTP_FROM` dans le temps ;
   changer d'identité régulièrement réinitialise la réputation.
6. **Pièces jointes** : les e-mails d'abonnement portent la facture PDF
   (`FACT-AAAA-NNNNNN.pdf`, un seul fichier, ~25 Ko) — le format attendu :
   petit, unique et annoncé dans le corps du message, ce qui n'active aucun
   filtre anti-spam. Évitez d'ajouter d'autres pièces jointes à ces envois.

---

## 5. Facture PDF jointe aux e-mails d'abonnement

À chaque **activation** (première souscription ou renouvellement) et à chaque
**confirmation de paiement** (validation d'un virement/D17, vérification d'un
reçu — Client Pro, Fournisseur et Expert), le client reçoit sa facture en pièce
jointe PDF :

- le document est généré **côté serveur** par le même module que le
  téléchargement depuis « Mes factures » (`src/lib/invoicePdf.ts`), à partir de
  la facture **enregistrée** : mêmes montants, même logo officiel, même numéro ;
- un encart « Votre facture N° … est jointe à cet e-mail » est ajouté au corps
  du message ; il n'apparaît que lorsqu'une facture est effectivement jointe ;
- la copie du PDF est archivée automatiquement (`invoices.pdfStorageId`) ; une
  facture déjà archivée n'est jamais remplacée ;
- si le document ne peut pas être produit, l'e-mail part **sans pièce jointe**
  et l'incident est journalisé côté serveur : une notification d'activation
  n'est jamais perdue pour autant.

Aucune facture n'est expédiée tant que le paiement n'est pas confirmé (une
souscription par virement reste « en attente »), et un renouvellement produit
une **nouvelle** facture jointe sans jamais écraser la précédente.