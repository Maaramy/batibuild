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
- **Signature DKIM** automatique si les variables `SMTP_DKIM_*` sont définies.

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
| `SMTP_DKIM_DOMAIN` | Domaine signé DKIM (voir ci-dessous) |
| `SMTP_DKIM_SELECTOR` | Sélecteur DKIM fourni par l'hébergeur (défaut `default`) |
| `SMTP_DKIM_PRIVATE_KEY` | Clé privée DKIM fournie par l'hébergeur (PEM, peut être collée avec `\n`) |

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

```
Type : TXT
Nom  : _dmarc
Valeur : v=DMARC1; p=quarantine; rua=mailto:dmarc@votredomaine.tn; ruf=mailto:dmarc@votredomaine.tn
```

- `p=quarantine` : les e-mails non authentifiés sont mis en spam au lieu
  d'être rejetés (bon point de départ).
- Après quelques semaines sans faux positifs : passez à `p=reject`.

### 2.4 MX (le domaine doit pouvoir recevoir du courrier)

Un domaine d'expéditeur sans enregistrement MX est considéré comme non
légitime. Si vous n'utilisez pas de boîte mail sur le domaine, ajoutez au
minimum un MX vers votre hébergeur e-mail.

---

## 3. Vérifier dans l'application

Administration → **E-mail** → bouton **« Vérifier la délivrabilité »** :

- contrôle MX, SPF, DKIM, DMARC et l'alignement du domaine ;
- affiche un rapport avec les enregistrements DNS exacts à ajouter ;
- ne renvoie jamais d'erreur technique brute.

Un test d'envoi réel est aussi disponible (**« Tester la configuration SMTP »**)
: vérifiez alors dans le client de messagerie les en-têtes
`Received-SPF: pass`, `dkim=pass` et `dmarc=pass`.

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