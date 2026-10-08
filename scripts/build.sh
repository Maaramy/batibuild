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
# Valeur : 900 Mo, le plafond du chemin RAPIDE de `tsc` — re-mesuré en
# 2026-10 : le contrôle de type a grossi, 752 Mo abandonne (V8, 75 s) et le
# repli économe 744 abandonne aussi (126 s), ce qui mettait le build hors
# délai ; 900 Mo passe en 41 s. Le chemin économe (`--jitless`, 848 Mo) et le
# choix entre les deux sont dans scripts/harden-build-bins.mjs : `tsc` étant
# résolu via node_modules/.bin, ce choix s'applique aussi ici.
# Surchargeable via BB_BUILD_HEAP_MB.
#
# Ce plafond ne gouverne PAS `vite build` : son plancher mesuré est bien plus
# bas — sous ~660 Mo de tas, Rollup abandonne
# (« Ineffective mark-compacts near heap limit »). Les enveloppes de
# node_modules/.bin posent donc leur propre plafond par binaire (tsc 900/848,
# vite 660 puis 900 si V8 abandonne) ; un drapeau de ligne de commande l'emporte
# sur NODE_OPTIONS, cette variable n'est ici qu'un filet de sécurité pour un
# appel direct aux binaires.
#
# Ce script ne couvre QUE `bun run build` : la mise en production est lancée par
# la plateforme avec la commande du gabarit Vite (`tsc -b && vite build`), qui
# n'appelle jamais ce fichier. Les plafonds sont donc AUSSI posés sur les
# binaires eux-mêmes par scripts/harden-build-bins.mjs (postinstall), qui est le
# seul mécanisme réellement partagé avec cette commande-là.
# ============================================================================

set -eu

export NODE_OPTIONS="--max-old-space-size=${BB_BUILD_HEAP_MB:-900}${NODE_OPTIONS:+ $NODE_OPTIONS}"

echo "[build] NODE_OPTIONS=$NODE_OPTIONS"

# 1. Typecheck des projets TypeScript (frontend + config Vite).
tsc -b

# 2. Bundling de production.
vite build
