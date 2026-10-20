# Audit & recalibrage — DQE « Rénovation salle de bain » (Tunisie 2026)

Date de l'audit : **20 octobre 2026**
Périmètre : **uniquement** le type de projet `renovation_salle_de_bain` (moteurs partagés corrigés seulement pour la cohérence).

---

## 1. Diagnostic de l'ancien DQE

L'ancien gabarit (`renovationSdbLots` dans `src/convex/dqeEngine.ts`) présentait quatre défauts structurels :

| # | Défaut | Effet constaté |
|---|---|---|
| 1 | Tous les lots étaient **calés sur un pourcentage du budget** (`percent`, puis `factor = lotBudget / rawTotal`) | Les prix unitaires de référence étaient réécrits pour tomber sur une enveloppe : deux articles différents finissaient au même prix, et le prix affiché ne correspondait plus au marché. |
| 2 | Les quantités des lignes sans `qMode` étaient **mises à l'échelle depuis la référence 120 m²** (`q × surface/120`) | Pour une salle de bain de 5 m² : « Démolition carrelage et faïence » passait de 20 m² à **0,83 m²**, « Étanchéité » de 20 à 0,83 m², la peinture de 30 à 1,25 m². Quantités non physiques. |
| 3 | Aucune **décomposition HT / TVA / TTC** | Totaux non vérifiables fiscalement. |
| 4 | Scénarios différenciés par un **coefficient global** (`×0,8` / `×1` / `×1,25`) | Un WC et un mitigeur variaient du même pourcentage, sans grille d'articles propre. |

### Anciens prix de référence (avant recalibrage)

| Poste | Ancien P.U. (TND) | Ancienne quantité | Ancien comportement |
|---|---:|---|---|
| Dépose sanitaires et robinetterie | 500 / lot | 1 | prix recalibré par le budget |
| Démolition carrelage et faïence | 20 / m² | 20 × (S/120) | 0,83 m² pour 5 m² |
| Évacuation des gravats | 200 / benne | 2 × (S/120) | 0,08 benne |
| Alimentation eau (PER) | 8 / ml | 15 (fixe) | quantité figée |
| Évacuation PVC Ø50/100 | 14 / ml | 10 (fixe) | quantité figée |
| Étanchéité liquide | 30 / m² | 20 × (S/120) | 0,83 m² |
| Carrelage sol grès cérame | 50 / m² | 6 × (S/120) | prix et quantité recalibrés |
| Faïence murale | 40 / m² | 22 × (S/120) | 0,92 m² |
| Ragréage / chape de pente | 25 / m² | 6 × (S/120) | 0,25 m² |
| WC complet | 280 / unité | 1 | prix recalibré |
| Lavabo + meuble | 450 / unité | 1 | prix recalibré |
| Receveur + paroi | 500 / unité | 1 | prix recalibré |
| Mitigeur douche | 300 / unité | 1 | prix recalibré |
| Mitigeur lavabo | 150 / unité | 1 | prix recalibré |
| Points électriques SDB | 90 / point | 4 | prix recalibré |
| VMC simple flux | 250 / unité | 1 | prix recalibré |
| Peinture murs/plafonds | 8 / m² | 30 × (S/120) | 1,25 m² |
| Chauffe-eau 80 L | 480 / unité | 1 | prix recalibré |

> Les lots étaient ensuite **renormalisés** pour que la somme des sous-totaux retombe exactement sur le budget du moteur BIM : les prix de référence ci-dessus n'étaient donc jamais ceux affichés.

---

## 2. Nouvelle structure (8 catégories, 43 postes)

Fichier source : **`src/lib/renovationSdbPricing.ts`** (module pur, testé) ; intégration moteur : `src/convex/dqeEngine.ts` (branche « DQE au réel ») et `src/convex/bimEngine.ts` (coût estimatif).

| Catégorie | Postes |
|---|---|
| **A. Dépose et démolition** | Dépose sanitaires/robinetterie · Démolition carrelage et faïence · Démolition localisée de cloisons (option) · Évacuation des gravats |
| **B. Maçonnerie et préparation** | Réparation/préparation des supports · Ragréage et mise à niveau · Pente d'évacuation douche · Enduits et reprises |
| **C. Étanchéité** | Primaire d'accrochage · Système d'étanchéité sous carrelage · Bandes angles/jonctions · Étanchéité spécifique douche et traversées |
| **D. Revêtements** | Carrelage sol antidérapant · Faïence murale · Grès cérame grand format (option) · Colle · Joints hydrofuges · Pose sol · Pose faïence · Plinthes/profilés · Pose plinthes |
| **E. Plomberie et évacuation** | Remplacement canalisations · Alimentation PER · Évacuations PVC · Collecteur et robinets d'arrêt · Siphons et bondes · Raccordement lavabo · Raccordement WC · Pose douche/baignoire · Mitigeur lavabo · Mitigeur douche · Mitigeur baignoire · Essais d'étanchéité |
| **F. Sanitaires et mobilier** | WC à poser/suspendu · Lavabo ou vasque · Meuble sous vasque · Miroir · Receveur 90×90 · Douche italienne (option) · Baignoire (option) · Paroi/cabine · Accessoires |
| **G. Électricité et ventilation** | Points électriques SDB · Mise à la terre et vérification · Extracteur d'air |
| **H. Finitions** | Joints silicone · Peinture pièces humides · Retouches et nettoyage final |

**Anti-doublon** : chaque fourniture n'apparaît qu'une seule fois (test dédié), les postes optionnels ne sont facturés que si l'option est sélectionnée.

---

## 3. Quantités recalculées à partir des dimensions réelles

Géométrie (`sdbGeometry`) — la surface de sol n'est **jamais** réutilisée comme surface de revêtement :

| Grandeur | Formule |
|---|---|
| Sol | `S` (surface saisie) |
| Périmètre | `4 × √S` (pièce supposée carrée) |
| Hauteur de faïence | `2,00 m` |
| Faïence nette | `périmètre × 2,00 − 1,4 m²` (ouverture de porte) |
| Marge de coupe | **+10 %** sur carrelage et faïence |
| Colle | `4 kg/m² × surface carrelée` |
| Joint hydrofuge | `0,5 kg/m² × surface carrelée` |
| Zone étanchée | `S + 2 × 0,9 × 2 m` (parois de douche) |
| Plinthes / bandes / joints silicone | `périmètre (+4 ml)` |
| Gravats | 1 benne ≤ 8 m², 2 bennes au-delà |
| Plomberie / électricité | 15 ml PER · 10 ml PVC · 3 siphons · 4 points électriques (quantités de chantier d'une pièce, **plus jamais** mises à l'échelle de 120 m²) |

Exemple, salle de bain de 5 m² : périmètre **8,94 ml**, faïence nette **16,49 m²**, sol carrelé **5,5 m²** (avec coupe), faïence **18 m²** (avec coupe), colle **95 kg**, joint **12 kg**, pose **5 m² + 16 m²** — contre respectivement 0,25 m² / 0,92 m² / 0,02 kg / 0,003 kg avant correction (après mise à l'échelle) ou 6 / 22 m² avant calage.

---

## 4. Nouvelle base de prix (TND HT, pose comprise)

Prix **standard** ; les colonnes Éco/Premium sont des grilles distinctes (voir §5). TVA **19 %** par défaut, réglable de 0 à 30 % dans l'administration, ajoutée par ligne (total TTC affiché).

| Poste | Éco | Standard | Premium |
|---|---:|---:|---:|
| Carrelage sol antidérapant (fourniture) | 22 | 34 | 55 /m² |
| Faïence murale (fourniture) | 20 | 32 | 48 /m² |
| Grès cérame grand format (option) | 38 | 58 | 92 /m² |
| Pose carrelage sol | 16 | 20 | 26 /m² |
| Pose faïence | 18 | 22 | 28 /m² |
| Colle à carrelage | 1,1 | 1,4 | 1,8 /kg |
| Joint hydrofuge | 5 | 7 | 9 /kg |
| Étanchéité liquide | 13 | 18 | 26 /m² |
| Primaire | 3 | 4 | 6 /m² |
| Bandes d'étanchéité | 4 | 6 | 9 /ml |
| Démolition carrelage/faïence (MO) | 10 | 12 | 15 /m² |
| Évacuation gravats | 180 | 220 | 280 /benne |
| Ragréage sol | 9 + 6 | 12 + 7 | 16 + 9 /m² |
| Alimentation PER (fourniture + MO) | 5 + 4 | 7 + 5 | 9 + 6 /ml |
| Évacuation PVC (fourniture + MO) | 7 + 4 | 9 + 5 | 12 + 6 /ml |
| WC | 190 | 330 | 620 /unité |
| Lavabo / vasque | 95 | 190 | 420 /unité |
| Meuble sous vasque | 170 | 330 | 690 /unité |
| Receveur 90×90 | 160 | 290 | 580 /unité |
| Douche italienne (option) | 380 | 600 | 980 /unité |
| Paroi / cabine | 220 | 420 | 800 /unité |
| Mitigeur lavabo | 75 | 160 | 340 /unité |
| Mitigeur douche | 160 | 300 | 620 /unité |
| Points électriques | 55 + 18 | 70 + 22 | 95 + 28 /point |
| Extracteur d'air | 150 + 50 | 190 + 70 | 280 + 100 /unité |
| Peinture pièces humides | 5 + 4 | 8 + 5 | 11 + 7 /m² |

Les fourchettes demandées sont respectées : carrelage 22–55 (fourchettes 15–80), faïence 20–48 (20–50), pose 16–28 (15–30), mitigeurs 75–620 selon gamme.

### Sources et honnêteté

- **Aucun flux fournisseur n'est connecté.** La base est datée (`SDB_PRICE_BASE.updatedAt = 2026-01-15`), étiquetée « prix indicatifs, à confirmer par devis » et affichée comme telle dans le Quantitatif détaillé.
- Les valeurs sont des **références internes BatiBuild** construites à partir des fourchettes publiques tunisiennes 2026 ; **elles n'ont pas été vérifiées ligne à ligne auprès d'un fournisseur nommé** — c'est signalé explicitement plutôt que d'inventer une référence de marché.
- Un prix réellement vérifié s'intègre via l'administration des matériaux (`materialPrices` : `name`, `unit`, `unitPrice`, `region`, `notes` = source, `lastUpdated` automatique). Il remplace alors le prix de référence de la ligne (voir §6).

---

## 5. Scénarios — grilles d'articles distinctes

- **Économique** : carrelage/faïence d'entrée de gamme, sanitaires et mitigeurs économiques, WC à poser.
- **Standard** : qualité courante durable (grès cérame R10, WC céramique, mitigeur cartouche céramique).
- **Premium** : grand format, WC suspendu avec bâti-support, meuble et mitigeries haut de gamme, paroi 8 mm.
- **Personnalisé** : part des modifications d'articles du client (mécanisme existant conservé).

Les totaux `Économique / Standard / Premium` exposés par le moteur BIM sont désormais la **somme des articles** de chaque grille (et non plus `×0,8 / ×1 / ×1,25`). Test dédié : plus de 10 lignes changent de prix entre Éco et Premium, à quantités identiques.

---

## 6. Synchronisation, TVA et administration

- `generateDqe` renvoie un DQE **au réel** (`allocatedSubtotal = subtotal`) : total = somme des postes ; aucune redistribution de prix.
- `projects.ts` enregistre `totalCost = total du DQE`, `costPerM2` et les scénarios correspondants → coût estimatif, sous-totaux, budget global et récapitulatif restent alignés.
- `runBIMEstimation` pour ce type calcule le coût **depuis le même module** (standard pour le total, grilles Éco/Premium pour les scénarios) : plus de divergence grille / DQE.
- Chaque ligne porte : `unitPrice` (TTC), `total`, `totalHT`, `vatRate = 19`, `vatAmount`, et la part main-d'œuvre (`labor`) lorsqu'elle existe.
- Page projet : le quantitatif de salle de bain est reconstruit **pour le scénario affiché**, avec les dimensions réelles ; le devis PDF utilise ce même quantitatif.
- **Prix administrés jusque dans l'affichage** : la page et le devis PDF résolvent chaque poste dans `materialPrices` (`buildSdbPriceResolver`) avant de chiffrer, avec la **même conversion TTC → HT que le moteur, au taux de TVA effectif** (`buildSdbPriceResolver(rows, sdbVatRate)`). Un prix saisi dans l'administration change donc le prix de la ligne, le sous-total de sa catégorie, le graphique « Répartition », le total affiché et le coût au m² — sans attendre une réactualisation serveur, et sans rééchelonner les autres postes. Un taux ≠ 19 % ne crée plus d'écart page / DQE (test de parité sur 19 %, 13 % et 7 %).
- **Taux de TVA réglé par l'administrateur** (`bimConfig.sdbVatRate`, 0–30 %) : appliqué à chaque ligne (`vatRate`, `vatAmount`) puis au lot et au total ; le HT est inchangé par un changement de taux (test dédié).
- **Action « Mettre à jour les prix »** (icône ↻ du Quantitatif détaillé, ex-« mettre à jour le quantitatif ») : relance le calcul serveur avec les prix administrés et le taux en vigueur, puis met à jour le DQE enregistré, le coût estimatif et les scénarios.
- **Total au dinar près** : le sous-total d'un lot est la somme des montants affichés de ses lignes (arrondis à l'unité) et le total est la somme des sous-totaux. Vérifié sur 5 m² avec un prix administré et une TVA à 13 % : DQE enregistré = **10 244**, page = **10 244**, somme des lignes = **10 244** (écart 0). Auparavant l'arrondi par ligne puis par total produisait un écart de 2,28 TND entre le DQE et l'affichage.
- **Date de mise à jour visible** : bandeau « Base BatiBuild — rénovation salle de bain (Tunisie 2026) · mise à jour du 15/01/2026 · TVA 19 % · N prix administrés (saisis le …) · prix indicatifs (aucun flux temps réel), à confirmer par devis » dans le Quantitatif détaillé.

### Administration — ce que l'administrateur peut réellement régler

| Réglage | Où | Effet vérifié |
|---|---|---|
| Prix unitaires, unités | Admin → Matériaux (édition en ligne) | Prix remplacé dans le DQE salle de bain, son total et le coût global ; l'ancien prix est conservé dans `priceHistory`. |
| Région, source, date | Admin → Matériaux (colonnes **Région** et **Source** éditables, **Mise à jour** affichée) | `region` et `notes` (= source / référence du devis) enregistrés avec le prix ; `lastUpdated` est posé par le serveur à chaque modification. |
| Taux de TVA | Admin → BIM → « TVA — rénovation salle de bain (%) » | Taux appliqué **ligne par ligne** (HT, TVA, TTC) sur tout le DQE salle de bain ; borné à 0–30 %, défaut 19 %, une saisie hors bornes est refusée. |
| Variation régionale | Admin → BIM (multiplicateurs régionaux) + région du projet | Le coefficient régional s'applique une seule fois aux prix de la grille salle de bain. |
| Actualisation | Bouton **« Mettre à jour les prix »** (icône ↻ du Quantitatif détaillé) | Relance le calcul serveur (`simulateAnalysis`) : DQE enregistré, coût estimatif et scénarios recalculés avec les prix administrés et le taux de TVA en vigueur. |

### Points non couverts (signalés)

| Demande | État |
|---|---|
| Historique des DQE déjà enregistrés | Non réécrits (préservation des données) : la page recalcule l'affichage salle de bain ; les autres types utilisent toujours leur DQE enregistré. |
| Vérification fournisseur ligne à ligne | **Non faite** : aucun fournisseur nommé n'a confirmé ces prix. La base est datée et présentée comme indicative (voir §4). |

---

## 7. Résultats des tests

| Test demandé | Résultat |
|---|---|
| 1. Articles différents ≠ prix identiques | ✅ `renovationSdbPricing.test.ts` (prix distincts WC/lavabo/mitigeur/carrelage) + `renovationSdb.test.ts` |
| 2. Cohérence quantités / unités / prix | ✅ quantités physiques (sol ≠ murs, marges de coupe, rendements colle/joint) |
| 3. Comparaison des 4 scénarios sur la même salle de bain | ✅ Éco < Standard < Premium, quantités identiques, grilles distinctes |
| 4. Options non comptées si non sélectionnées | ✅ italienne / baignoire / cloisons / WC / extracteur |
| 5. Sous-totaux HT, TVA, TTC | ✅ par ligne, par lot et au total ; 19 % par défaut, 13 % et 7 % vérifiés moteur **et** page (le serveur n'accepte que 0–30 %), taux invalide (55 %) refusé et remplacé par 19 % |
| 6. Prix administré → DQE, affichage et coût global | ✅ moteur (`livePrices` : ligne, total, mention « prix administré ») **et** page/devis (`buildSdbPriceResolver`, conversion au taux effectif) + test de parité page = DQE à 19 / 13 / 7 % |
| 7. Petite et grande salle de bain | ✅ 4 m² vs 8 m² (quantités et total croissants, prix unitaires stables) |
| 8. Autres types de projets inchangés | ✅ maison / appartement / bureau / cuisine conservent leur calage historique |

Exécution : **119 fichiers, 1892 tests réussis** (`bun x vitest run`), `convex dev --once` et `tsc -b --noEmit` sans erreur.

Parité verrouillée par un test permanent (`renovationSdb.test.ts` → « parité affichage ↔ DQE enregistré ») : pour 5 m² standard avec trois prix administrés et une TVA de 19 %, 13 % puis 7 %, le total du DQE enregistré, le total de la page et la somme des lignes affichées sont **identiques au dinar**, et le TTC d'un poste administré est le même des deux côtés.

### Répartition effectivement affichée — projet #49 (5 m², Standard)

Valeurs produites par `sdbDqeLots` → `buildChartBreakdownFromLots` (source unique du graphique, du détail par catégorie et du quantitatif) :

| Catégorie | Ancien affichage (capture) | Nouveau montant TTC | Part |
|---|---:|---:|---:|
| Dépose et démolition | 616 (8 %) | **990** | 10,1 % |
| Maçonnerie et préparation | — (absent) | **652** | 6,7 % |
| Étanchéité | 616 (8 %) | **664** | 6,8 % |
| Revêtements (carrelage et faïence) | 1 694 (22 %) | **1 874** | 19,2 % |
| Plomberie et évacuation | 1 155 (15 %) | **2 140** | 21,9 % |
| Sanitaires et mobilier | 1 155 (15 %) | **2 148** | 22,0 % |
| Électricité et ventilation | 308 (4 %) + 616 (8 %) | **890** | 9,1 % |
| Finitions (peinture + joints) | 308 (4 %) + 616 (8 %) | **415** | 4,2 % |
| **Total TTC** | ≈ 7 700 | **9 773** | 100 % |

Plus aucune catégorie ne partage le même montant par construction ; les postes « Robinetterie », « Ventilation », « Équipements techniques » qui apparaissaient comme catégories distinctes sont désormais **des postes** rangés dans leur lot (plomberie / électricité / sanitaires), sans double comptage.

---

## 8. Fichiers modifiés

- `src/lib/renovationSdbPricing.ts` — **nouveau** : grilles de prix, géométrie, lignes, TVA réglable, totaux, export DQE, résolveur de prix administrés.
- `src/convex/dqeEngine.ts` — branche DQE au réel pour la salle de bain, champs TVA sur les lignes, prix administrés, taux de TVA transmis.
- `src/convex/bimEngine.ts` — coût et scénarios issus du module (plus de coefficient global), répartition par nature réelle.
- `src/convex/projects.ts` — DQE salle de bain recalculé avec les prix administrés et le taux de TVA de `bimConfig`.
- `src/convex/bimConfig.ts`, `src/convex/schema.ts` — réglage `sdbVatRate` (0–30 %, défaut 19 %), lecture/écriture et validation.
- `src/pages/ProjectDetail.tsx` — quantitatif reconstruit par scénario, prix administrés et TVA appliqués à l'affichage et au devis PDF, totaux synchronisés, bandeau de provenance des prix, action « Mettre à jour les prix ».
- `src/pages/BIMSettings.tsx` — champ administratif du taux de TVA salle de bain.
- `src/pages/AdminPanel.tsx` — édition de la région et de la source d'un prix, date de mise à jour affichée, message de propagation.
- `src/lib/surfaceRangeSync.test.ts` — invariant adapté : la salle de bain n'est plus calibrée sur un pourcentage (comportement demandé).
- `src/lib/renovationSdbPricing.test.ts`, `src/convex/renovationSdb.test.ts` — **nouveaux** tests (40 cas, dont la parité affichage ↔ DQE enregistré à plusieurs taux de TVA).
