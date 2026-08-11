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

rep(
"""          const headWall = wallNoWindow(doorWall ? [oppositeWall(doorWall), ...perpendicularWalls(doorWall)] : ["bottom", "top"]);
          const len = headWall === "top" || headWall === "bottom" ? room.w : room.h;
          const bed = aw(headWall, bedW, bedD, Math.max(0.25, (len - bedW) / 2), "lit", "Lit");""",
"""          const headWall = wallNoWindow(doorWall ? [oppositeWall(doorWall), ...perpendicularWalls(doorWall)] : ["bottom", "top"]);
          const len = headWall === "top" || headWall === "bottom" ? room.w : room.h;
          // Essaie la largeur préférée, puis des lits plus étroits si la pièce
          // est contrainte (porte en zone d'ouverture, pièce étroite…)
          let bed: FRect | null = null;
          for (const bw of [bedW, 1.6, 1.4]) {
            const b = aw(headWall, bw, bedD, Math.max(0.25, (len - bw) / 2), "lit", "Lit");
            if (b) { bed = b; break; }
          }""")

open(P, "w", encoding="utf-8").write(src)
print("OK")
