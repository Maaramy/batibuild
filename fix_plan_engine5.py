P = "/home/daytona/codebase/src/convex/planEngine.ts"
src = open(P, encoding="utf-8").read()

def rep(old, new, count=1, required=True):
    global src
    n = src.count(old)
    if n < count:
        if required:
            raise SystemExit(f"NOT FOUND ({n}): {old[:110]!r}")
        return
    src = src.replace(old, new, count)

# ── 1. Portes décentrées (à ~1/3 du bord partagé) : dégage les murs pour le
#    mobilier et réduit les risques de chevauchement des battants ──
rep(
"""function doorBetween(a: PlacedRoom, b: PlacedRoom, kind: string): Door | null {
  const EPS = 0.45;
  const candidates: { x: number; y: number; angle: number }[] = [];
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const midX = Math.max(a.x, b.x) + overlapX / 2;
  const midY = Math.max(a.y, b.y) + overlapY / 2;
  // a au-dessus de b : porte sur le bord bas de a
  if (Math.abs(a.y + a.h - b.y) < EPS && overlapX > 0.7) {
    candidates.push({ x: snap(midX - 0.45), y: a.y + a.h - 1, angle: Math.PI / 2 });
  }
  // a en-dessous de b
  if (Math.abs(a.y - (b.y + b.h)) < EPS && overlapX > 0.7) {
    candidates.push({ x: snap(midX - 0.45), y: a.y, angle: -Math.PI / 2 });
  }
  // a à gauche de b
  if (Math.abs(a.x + a.w - b.x) < EPS && overlapY > 0.7) {
    candidates.push({ x: a.x + a.w - 1, y: snap(midY - 0.45), angle: 0 });
  }
  // a à droite de b
  if (Math.abs(a.x - (b.x + b.w)) < EPS && overlapY > 0.7) {
    candidates.push({ x: a.x, y: snap(midY - 0.45), angle: Math.PI });
  }""",
"""function doorBetween(a: PlacedRoom, b: PlacedRoom, kind: string): Door | null {
  const EPS = 0.45;
  const candidates: { x: number; y: number; angle: number }[] = [];
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  // Porte décentrée à ~1/3 du bord partagé : dégage le reste du mur pour le
  // mobilier et limite le chevauchement des battants entre portes voisines.
  const offX = Math.max(a.x, b.x) + overlapX * 0.32;
  const offY = Math.max(a.y, b.y) + overlapY * 0.32;
  // a au-dessus de b : porte sur le bord bas de a
  if (Math.abs(a.y + a.h - b.y) < EPS && overlapX > 0.7) {
    candidates.push({ x: snap(offX - 0.45), y: a.y + a.h - 1, angle: Math.PI / 2 });
  }
  // a en-dessous de b
  if (Math.abs(a.y - (b.y + b.h)) < EPS && overlapX > 0.7) {
    candidates.push({ x: snap(offX - 0.45), y: a.y, angle: -Math.PI / 2 });
  }
  // a à gauche de b
  if (Math.abs(a.x + a.w - b.x) < EPS && overlapY > 0.7) {
    candidates.push({ x: a.x + a.w - 1, y: snap(offY - 0.45), angle: 0 });
  }
  // a à droite de b
  if (Math.abs(a.x - (b.x + b.w)) < EPS && overlapY > 0.7) {
    candidates.push({ x: a.x, y: snap(offY - 0.45), angle: Math.PI });
  }""")

# ── 2. Zone d'ouverture des portes : pad réduit (0,12 au lieu de 0,24) ──
rep(
"""function doorSwing(d: Door): FRect {
  return { x: d.x - 0.12, y: d.y - 0.12, w: d.w + 0.24, h: d.h + 0.24 };
}""",
"""function doorSwing(d: Door): FRect {
  return { x: d.x - 0.06, y: d.y - 0.06, w: d.w + 0.12, h: d.h + 0.12 };
}""")

# ── 3. Lit adapté à la pièce (largeur/longueur réduites si nécessaire) ──
rep(
"""        case "chambre":
        case "master": {
          const bedW = room.type === "master" || req.standing === "premium" ? 1.8 : 1.6;
          const headWall = wallNoWindow(doorWall ? [oppositeWall(doorWall), ...perpendicularWalls(doorWall)] : ["bottom", "top"]);""",
"""        case "chambre":
        case "master": {
          const roomMin = Math.min(room.w, room.h);
          const bedW = roomMin < 2.7 ? 1.4 : room.type === "master" || req.standing === "premium" ? 1.8 : 1.6;
          const bedD = roomMin < 3.6 ? 1.95 : 2.05;
          const headWall = wallNoWindow(doorWall ? [oppositeWall(doorWall), ...perpendicularWalls(doorWall)] : ["bottom", "top"]);""")
rep(
"""          const bed = aw(headWall, bedW, 2.05, Math.max(0.25, (len - bedW) / 2), "lit", "Lit");""",
"""          const bed = aw(headWall, bedW, bedD, Math.max(0.25, (len - bedW) / 2), "lit", "Lit");""")

open(P, "w", encoding="utf-8").write(src)
print("OK")
