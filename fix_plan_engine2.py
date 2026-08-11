import re

P = "/home/daytona/codebase/src/convex/planEngine.ts"
src = open(P, encoding="utf-8").read()

def rep(old, new, count=1, required=True):
    global src
    n = src.count(old)
    if n < count:
        if required:
            raise SystemExit(f"NOT FOUND ({n}): {old[:100]!r}")
        return
    src = src.replace(old, new, count)

# ── A. placeAgainstWall : supprimer le repli « chevauchement minimal » ──
rep(
"""  // Repli : emplacement à chevauchement minimal
  let best: { rect: FRect; angle: number } | null = null;
  let bestO = Infinity;
  for (const t of candidates) {
    if (t < margin - 0.01 || t > maxT + 0.01) continue;
    const { rect } = build(t);
    const o = obstacles.reduce((s, ob) => s + overlapArea(rect, ob), 0) +
      placed.reduce((s, p) => s + overlapArea(rect, p), 0);
    if (o < bestO) { bestO = o; best = build(t); }
  }
  return best;
}""",
"""  // Aucun emplacement sans collision : le mobilier est omis (ou essayé
  // sur un autre mur par l'appelant) plutôt que placé en chevauchement.
  return null;
}""")

# ── B. aw : essayer les 4 murs (préféré d'abord), sans repli ──
rep(
"""    const aw = (wall: Wall, w: number, d: number, t: number, kind: FurnitureKind, label: string, ignores: FRect[] = []) => {
      const r = placeAgainstWall(room, wall, w, d, t, obstacles, placed, rand, 0.25, ignores);
      if (r) { push(room, kind, label, r.rect, r.angle); placed.push(r.rect); return r.rect; }
      return null;
    };""",
"""    const WALLS_ALL: Wall[] = ["top", "bottom", "left", "right"];
    const aw = (wall: Wall, w: number, d: number, t: number, kind: FurnitureKind, label: string, ignores: FRect[] = []) => {
      const order = [wall, ...WALLS_ALL.filter((x) => x !== wall)];
      for (const wl of order) {
        const r = placeAgainstWall(room, wl, w, d, t, obstacles, placed, rand, 0.25, ignores);
        if (r) { push(room, kind, label, r.rect, r.angle); placed.push(r.rect); return r.rect; }
      }
      return null;
    };""")

# ── C. tables de chevet : vérifier aussi les obstacles ──
rep(
"""            const ns1: FRect = { x: bed.x - 0.58, y: bed.y, w: 0.45, h: 0.45 };
            if (ns1.x >= room.x + 0.12) { push(room, "table_chevet", "Chevet", ns1, 0); placed.push(ns1); }
            const ns2: FRect = { x: bed.x + bed.w + 0.13, y: bed.y, w: 0.45, h: 0.45 };
            if (ns2.x + ns2.w <= room.x + room.w - 0.12) { push(room, "table_chevet", "Chevet", ns2, 0); placed.push(ns2); }""",
"""            const ns1: FRect = { x: bed.x - 0.58, y: bed.y, w: 0.45, h: 0.45 };
            if (ns1.x >= room.x + 0.12 && !obstacles.some((o) => rectsOverlap(ns1, o, 0.05))) { push(room, "table_chevet", "Chevet", ns1, 0); placed.push(ns1); }
            const ns2: FRect = { x: bed.x + bed.w + 0.13, y: bed.y, w: 0.45, h: 0.45 };
            if (ns2.x + ns2.w <= room.x + room.w - 0.12 && !obstacles.some((o) => rectsOverlap(ns2, o, 0.05))) { push(room, "table_chevet", "Chevet", ns2, 0); placed.push(ns2); }""")

# ── D. table de salle à manger : éviter les obstacles (décalage) ──
rep(
"""        case "salleAManger": {
          const tw = clamp(Math.min(room.w, room.h) * 0.55, 1.4, 2.0);
          const th = clamp(Math.min(room.w, room.h) * 0.3, 0.8, 1.0);
          const table: FRect = { x: room.x + (room.w - tw) / 2, y: room.y + (room.h - th) / 2, w: tw, h: th };
          push(room, "table", "Table", table, 0); placed.push(table);""",
"""        case "salleAManger": {
          const tw = clamp(Math.min(room.w, room.h) * 0.55, 1.4, 2.0);
          const th = clamp(Math.min(room.w, room.h) * 0.3, 0.8, 1.0);
          let table: FRect = { x: room.x + (room.w - tw) / 2, y: room.y + (room.h - th) / 2, w: tw, h: th };
          // Éviter la zone d'ouverture de la porte : décaler la table
          const tableSpots: FRect[] = [];
          for (let dy = 0; dy <= 0.9; dy += 0.3) {
            tableSpots.push(table);
            table = { ...table, y: table.y + 0.3 };
          }
          table = tableSpots.find((t) => !obstacles.some((o) => rectsOverlap(t, o, 0.05))) ?? tableSpots[0];
          push(room, "table", "Table", table, 0); placed.push(table);""")

# ── E. generateVariant : retourner le plan micro-corrigé (fenêtres,
#    portes, mobilier) avec qualité recalculée ──
rep(
"""  // Mobilier & équipements (contraintes : portes, fenêtres, dimensions)
  plan.furniture = generateFurniture(plan, req, rng);
  // Contrôle qualité automatique (recommandations + corrections)
  plan.quality = analyzePlanQuality(plan, req);
  return plan;
}""",
"""  // Corrections automatiques (fenêtres recentrées, portes décalées,
  // mobilier réorganisé) puis contrôle qualité — chaque plan est livré
  // déjà optimisé, et le rapport liste ce qui reste à améliorer.
  return applyMicroFixes(plan, req);
}""")

# ── F. QA mobilier/porte : chevauchement réel uniquement (pas de marge) ──
rep(
"""      if (rectsOverlap({ x: f.x, y: f.y, w: f.w, h: f.h }, doorSwing(d), 0.08)) {""",
"""      if (rectsOverlap({ x: f.x, y: f.y, w: f.w, h: f.h }, doorSwing(d), 0.03)) {""")

open(P, "w", encoding="utf-8").write(src)
print("OK - all fixes applied")
