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

# 1. Séparer les obstacles portes / fenêtres
rep(
"""    const obstacles: FRect[] = [
      ...doorsIn.map(doorSwing),
      ...windowsIn.map((w) => windowBand(w, room, plan.width, plan.depth)),
    ];
    const placed: FRect[] = [];""",
"""    const doorObstacles = doorsIn.map(doorSwing);
    const windowObstacles = windowsIn.map((w) => windowBand(w, room, plan.width, plan.depth));
    const obstacles: FRect[] = [...doorObstacles, ...windowObstacles];
    const placed: FRect[] = [];""")

# 2. Cuisine : le plan de travail et les appareils passent SOUS les fenêtres
#    (pratique standard), mais évitent les portes
rep(
"""          const counterWall = prefWalls.find((w) => w !== doorWall) ?? "bottom";
          const along = counterWall === "top" || counterWall === "bottom" ? room.w : room.h;
          const counterLen = clamp(along - 0.9, 1.6, 4.4);
          const counter = aw(counterWall, counterLen, 0.62, 0.25, "plan_travail", "Plan de travail");""",
"""          const counterWall = prefWalls.find((w) => w !== doorWall) ?? "bottom";
          const along = counterWall === "top" || counterWall === "bottom" ? room.w : room.h;
          const counterLen = Math.min(clamp(along - 0.9, 1.5, 4.4), Math.max(1.2, along - 0.6));
          const counter = placeAgainstWall(room, counterWall, counterLen, 0.62, 0.25, doorObstacles, placed, rand, 0.25, windowObstacles);
          if (counter) { push(room, "plan_travail", "Plan de travail", counter.rect, counter.angle); placed.push(counter.rect); }""")
rep(
"""            const base = counterWall === "bottom" || counterWall === "top" ? counter.x - room.x : counter.y - room.y;
            aw(counterWall, 0.55, 0.55, base + 0.18, "evier", "Évier", [counter]);
            aw(counterWall, 0.6, 0.6, base + 0.78, "plaque", "Plaque de cuisson", [counter]);
            aw(counterWall, 0.6, 0.6, base + 1.42, "four", "Four", [counter]);
            aw(counterWall, 0.66, 0.66, base + 2.06, "frigo", "Réfrigérateur", [counter]);""",
"""            const base = counterWall === "bottom" || counterWall === "top" ? counter.x - room.x : counter.y - room.y;
            const appObstacles = [...doorObstacles];
            const app = (w: number, d: number, t: number, kind: FurnitureKind, label: string) => {
              const r = placeAgainstWall(room, counterWall, w, d, t, appObstacles, placed, rand, 0.3, [counter]);
              if (r) { push(room, kind, label, r.rect, r.angle); placed.push(r.rect); }
            };
            app(0.55, 0.55, base + 0.18, "evier", "Évier");
            app(0.6, 0.6, base + 0.78, "plaque", "Plaque de cuisson");
            app(0.6, 0.6, base + 1.42, "four", "Four");
            app(0.66, 0.66, base + 2.06, "frigo", "Réfrigérateur");""")

open(P, "w", encoding="utf-8").write(src)
print("OK")
