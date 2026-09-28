#!/bin/sh
# ============================================================================
# BUILD DE PRODUCTION — enchaîne le typecheck puis le bundling Vite
# ----------------------------------------------------------------------------
# Pourquoi un script plutôt qu'une ligne dans package.json ?
#
# La sandbox de build tourne dans un cgroup de 2 Go, partagé avec le serveur
# Vite et `convex dev` (~500 Mo). Sans plafond, V8 laisse le tas grandir et
# l'OOM killer termine le build (« Killed », sans message de V8) : c'est ce qui
# a fait échouer la mise en production.
#
# Un `export NODE_OPTIONS=… && …` en tête du script « build » de package.json
# n'est pas fiable : les plateformes qui recopient cette commande la nettoient
# (préfixes d'environnement retirés) et le plafond disparaît silencieusement —
# c'est exactement pourquoi un plafond y avait déjà été ajouté sans effet sur
# le build déployé. Un plafond posé ICI, dans un fichier lu par le shell, ne
# peut pas être « nettoyé » : il s'applique quelle que soit la façon dont la
# commande a été transmise.
#
# Valeur : 800 Mo pour les DEUX phases. Mesuré dans cette sandbox, `tsc` comme
# Rollup ont un jeu de données vivant de 650 à 800 Mo : en dessous le build
# meurt sur « JavaScript heap out of memory » (abort V8), au-dessus V8 conserve
# des déchets jusqu'à franchir la limite du cgroup. Surchargeable via
# BB_BUILD_HEAP_MB.
#
# Ce script ne couvre QUE `bun run build` : la mise en production est lancée par
# la plateforme avec la commande du gabarit Vite (`tsc -b && vite build`), qui
# n'appelle jamais ce fichier. Le même plafond est donc aussi posé sur les
# binaires eux-mêmes par scripts/harden-build-bins.mjs (postinstall) — mesuré :
# 1 413 Mo de pic sans plafond, 1 152 Mo avec.
# ============================================================================

set -eu

export NODE_OPTIONS="--max-old-space-size=${BB_BUILD_HEAP_MB:-800}${NODE_OPTIONS:+ $NODE_OPTIONS}"

echo "[build] NODE_OPTIONS=$NODE_OPTIONS"

# 1. Typecheck des projets TypeScript (frontend + config Vite).
tsc -b

# 2. Bundling de production.
vite build
