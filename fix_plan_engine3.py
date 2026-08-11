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

# ── 1. Fonction fixNarrowRooms (insérée avant « Portes & fenêtres ») ──
rep(
"""  // Portes & fenêtres
  const doors = buildDoors(allPlaced, req.entreePosition);""",
"""  // Élargir les pièces trop étroites en empruntant au voisin partageant un bord
  fixNarrowRooms(ground);
  fixNarrowRooms(upper);

  // Portes & fenêtres
  const doors = buildDoors(allPlaced, req.entreePosition);""")

rep(
"""// ─── Chevauchements ─────────────────────────────────────────────────────────""",
"""// ─── Correction des pièces trop étroites ────────────────────────────────────

function fixNarrowRooms(rooms: PlacedRoom[]): void {
  const minSide = (r: PlacedRoom) => (r.type === "sdb" ? 1.2 : r.type === "wc" ? 1.0 : 1.5);
  for (let pass = 0; pass < 3; pass++) {
    for (const r of rooms) {
      const min = minSide(r);
      if (r.w >= min && r.h >= min) continue;
      const share = (o: PlacedRoom) =>
        o !== r && o.level === r.level &&
        Math.min(r.y + r.h, o.y + o.h) - Math.max(r.y, o.y) > Math.min(r.h, o.h) * 0.55;
      if (r.w < min) {
        const nb = rooms.find((o) => share(o) && (Math.abs(o.x + o.w - r.x) < 0.02 || Math.abs(o.x - (r.x + r.w)) < 0.02));
        if (nb && nb.w > 1.25 && minSide(nb) < nb.w) {
          const delta = Math.min(min - r.w, nb.w - 1.25, 0.6);
          if (delta > 0.05) {
            if (Math.abs(nb.x + nb.w - r.x) < 0.02) { r.x -= delta; r.w += delta; nb.w -= delta; }
            else { nb.x += delta; nb.w -= delta; r.w += delta; }
            r.area = round1(r.w * r.h);
            nb.area = round1(nb.w * nb.h);
            continue;
          }
        }
      }
      if (r.h < min) {
        const nb = rooms.find((o) => share(o) && (Math.abs(o.y + o.h - r.y) < 0.02 || Math.abs(o.y - (r.y + r.h)) < 0.02));
        if (nb && nb.h > 1.25 && minSide(nb) < nb.h) {
          const delta = Math.min(min - r.h, nb.h - 1.25, 0.6);
          if (delta > 0.05) {
            if (Math.abs(nb.y + nb.h - r.y) < 0.02) { r.y -= delta; r.h += delta; nb.h -= delta; }
            else { nb.y += delta; nb.h -= delta; r.h += delta; }
            r.area = round1(r.w * r.h);
            nb.area = round1(nb.w * nb.h);
          }
        }
      }
    }
  }
}

// ─── Chevauchements ─────────────────────────────────────────────────────────""")

# ── 2. Parasol décalé par rapport à la table d'extérieur ──
rep(
"""          push(room, "table_exterieur", "Table d'extérieur", t, 0);
          push(room, "chaise", "Chaise", { x: t.x - 0.55, y: t.y + t.h / 2 - 0.22, w: 0.45, h: 0.45 }, 0);
          push(room, "chaise", "Chaise", { x: t.x + t.w + 0.1, y: t.y + t.h / 2 - 0.22, w: 0.45, h: 0.45 }, 0);
          push(room, "parasol", "Parasol", { x: room.x + room.w / 2 - 0.18, y: room.y + room.h / 2 - 0.18, w: 0.36, h: 0.36 }, 0);""",
"""          push(room, "table_exterieur", "Table d'extérieur", t, 0);
          push(room, "chaise", "Chaise", { x: t.x - 0.55, y: t.y + t.h / 2 - 0.22, w: 0.45, h: 0.45 }, 0);
          push(room, "chaise", "Chaise", { x: t.x + t.w + 0.1, y: t.y + t.h / 2 - 0.22, w: 0.45, h: 0.45 }, 0);
          const parasol = { x: t.x + t.w + 0.4, y: t.y - 0.25, w: 0.36, h: 0.36 };
          if (parasol.x + parasol.w <= room.x + room.w - 0.1 && parasol.y >= room.y + 0.1) {
            push(room, "parasol", "Parasol", parasol, 0);
          }""")

open(P, "w", encoding="utf-8").write(src)
print("OK")
