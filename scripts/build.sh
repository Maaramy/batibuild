#!/bin/sh
# ============================================================================
# BUILD DE PRODUCTION — typecheck puis bundling Vite
# ----------------------------------------------------------------------------
# Pourquoi un script plutôt qu'une ligne dans package.json ?
#
# La sandbox de build tourne dans un cgroup de 2 Go, partagé avec le serveur
# Vite et `convex dev` (~500 Mo). Sans plafond, V8 laisse le tas grandir et
# l'OOM killer termine le build (« Killed », sans message de V8).
#
# Un `export NODE_OPTIONS=… && …` en tête du script « build » de package.json
# n'est pas fiable : les plateformes qui recopient cette commande la nettoient.
# Le plafond est donc posé ICI (fichier lu par le shell) ET sur les binaires
# eux-mêmes par scripts/harden-build-bins.mjs (postinstall) — ce dernier est le
# seul mécanisme partagé avec la commande du gabarit Vite (`tsc -b && vite
# build`), que la plateforme peut lancer sans passer par ce fichier.
#
# ── Plafonds actuels (re-mesurés 2026-10, checkout froid) ───────────────────
#   · tsc (JIT)  900 Mo ....... OK en 56 s (752 Mo abandonne)
#   · vite        900 Mo ...... OK en 28 s (660 Mo abandonne en 35 s puis
#                              réussit au repli : 63 s payés à chaque build)
#
# Le mode `--jitless` a été RETIRÉ : 2 à 3× plus lent (120 à 173 s), il faisait
# dépasser le délai de la sandbox de déploiement. Un seul essai rapide, puis le
# code de sortie est propagé : un échec arrête le build au lieu de lancer
# `vite build` sur un typecheck déjà mort.
#
# Chaque phase journalise sa durée : le journal de déploiement indique ainsi
# l'étape lente sans avoir à instrumenter quoi que ce soit.
# ============================================================================

set -eu

export NODE_OPTIONS="--max-old-space-size=${BB_BUILD_HEAP_MB:-900}${NODE_OPTIONS:+ $NODE_OPTIONS}"

echo "[build] NODE_OPTIONS=$NODE_OPTIONS"

# 1. Typecheck des projets TypeScript (frontend + config Vite).
phase_started=$(date +%s)
tsc -b
echo "[build] tsc -b : $(( $(date +%s) - phase_started )) s"

# 2. Bundling de production.
phase_started=$(date +%s)
vite build
echo "[build] vite build : $(( $(date +%s) - phase_started )) s"
