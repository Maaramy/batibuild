import re

P = "/home/daytona/codebase/src/convex/planEngine.ts"
src = open(P, encoding="utf-8").read()

def rep(old, new, count=1, required=True):
    global src
    n = src.count(old)
    if n < count:
        if required:
            raise SystemExit(f"NOT FOUND ({n}): {old[:120]!r}")
        return
    src = src.replace(old, new, count)

# ── 1. Circulation : ne pas arrondir la largeur du hall (évite le chevauchement
#    de 7 cm avec les pièces placées à droite du hall central) ──
rep(
"""  const circ: PlacedRoom = {
    id: "circulation-0", name: "Entrée & circulation", type: "circulation",
    x: circRect.x, y: circRect.y, w: snap(circRect.w), h: snap(circRect.h),
    area: round1(circRect.w * circRect.h), level: 0, exterior: false,
    color: ROOM_COLORS.circulation,
  };""",
"""  const circ: PlacedRoom = {
    id: "circulation-0", name: "Entrée & circulation", type: "circulation",
    x: circRect.x, y: circRect.y, w: circRect.w, h: circRect.h,
    area: round1(circRect.w * circRect.h), level: 0, exterior: false,
    color: ROOM_COLORS.circulation,
  };""")

# ── 2. Réécriture de fixNarrowRooms : ajuste TOUTES les pièces de la ligne de
#    découpe et vérifie l'absence de chevauchement avant de valider ──
old_fix = re.search(r"function fixNarrowRooms\(rooms: PlacedRoom\[\]\): void \{.*?\n\}\n", src, re.S)
if not old_fix:
    raise SystemExit("fixNarrowRooms not found")

new_fix = '''function fixNarrowRooms(rooms: PlacedRoom[]): void {
  const minSide = (r: PlacedRoom) => (r.type === "sdb" ? 1.2 : r.type === "wc" ? 1.0 : 1.5);
  const yOv = (a: PlacedRoom, b: PlacedRoom) => Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const xOv = (a: PlacedRoom, b: PlacedRoom) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlaps = (a: PlacedRoom, b: PlacedRoom) => Math.max(0, xOv(a, b)) * Math.max(0, yOv(a, b));
  // Toutes les pièces ajustées doivent rester sans chevauchement
  const verify = (changed: PlacedRoom[]) =>
    !rooms.some((o) => changed.some((c) => c !== o && overlaps(c, o) > 0.02));

  for (let pass = 0; pass < 3; pass++) {
    for (const r of rooms) {
      const min = minSide(r);
      if (r.w >= min && r.h >= min) continue;

      if (r.w < min) {
        const lefts = rooms.filter((o) => o !== r && o.level === r.level && Math.abs(o.x + o.w - r.x) < 0.05 && yOv(o, r) > 0.3);
        const rights = rooms.filter((o) => o !== r && o.level === r.level && Math.abs(o.x - (r.x + r.w)) < 0.05 && yOv(o, r) > 0.3);
        const borrowable = (side: PlacedRoom[]) => side.length > 0 && side.every((o) => o.w > 1.3 && minSide(o) < o.w);
        let delta = 0;
        if (borrowable(lefts)) delta = Math.min(min - r.w, 0.6, Math.min(...lefts.map((o) => o.w - 1.3)));
        if (delta > 0.05) {
          // r grandit vers la gauche : toutes les pièces de gauche rétrécissent
          const snap = lefts.map((o) => ({ w: o.w }));
          r.x -= delta; r.w += delta;
          lefts.forEach((o, i) => { o.w = snap[i].w - delta; });
          if (verify([r, ...lefts])) {
            r.area = round1(r.w * r.h);
            lefts.forEach((o) => { o.area = round1(o.w * o.h); });
          } else {
            r.x += delta; r.w -= delta;
            lefts.forEach((o, i) => { o.w = snap[i].w; });
          }
        } else if (borrowable(rights)) {
          delta = Math.min(min - r.w, 0.6, Math.min(...rights.map((o) => o.w - 1.3)));
          if (delta > 0.05) {
            // r grandit vers la droite : toutes les pièces de droite se décalent
            const snap = rights.map((o) => ({ x: o.x, w: o.w }));
            r.w += delta;
            rights.forEach((o, i) => { o.x = snap[i].x + delta; o.w = snap[i].w - delta; });
            if (verify([r, ...rights])) {
              r.area = round1(r.w * r.h);
              rights.forEach((o) => { o.area = round1(o.w * o.h); });
            } else {
              r.w -= delta;
              rights.forEach((o, i) => { o.x = snap[i].x; o.w = snap[i].w; });
            }
          }
        }
      }

      if (r.h < min) {
        const tops = rooms.filter((o) => o !== r && o.level === r.level && Math.abs(o.y + o.h - r.y) < 0.05 && xOv(o, r) > 0.3);
        const bottoms = rooms.filter((o) => o !== r && o.level === r.level && Math.abs(o.y - (r.y + r.h)) < 0.05 && xOv(o, r) > 0.3);
        const borrowable = (side: PlacedRoom[]) => side.length > 0 && side.every((o) => o.h > 1.3 && minSide(o) < o.h);
        let delta = 0;
        if (borrowable(tops)) delta = Math.min(min - r.h, 0.6, Math.min(...tops.map((o) => o.h - 1.3)));
        if (delta > 0.05) {
          const snap = tops.map((o) => ({ h: o.h }));
          r.y -= delta; r.h += delta;
          tops.forEach((o, i) => { o.h = snap[i].h - delta; });
          if (verify([r, ...tops])) {
            r.area = round1(r.w * r.h);
            tops.forEach((o) => { o.area = round1(o.w * o.h); });
          } else {
            r.y += delta; r.h -= delta;
            tops.forEach((o, i) => { o.h = snap[i].h; });
          }
        } else if (borrowable(bottoms)) {
          delta = Math.min(min - r.h, 0.6, Math.min(...bottoms.map((o) => o.h - 1.3)));
          if (delta > 0.05) {
            const snap = bottoms.map((o) => ({ y: o.y, h: o.h }));
            r.h += delta;
            bottoms.forEach((o, i) => { o.y = snap[i].y + delta; o.h = snap[i].h - delta; });
            if (verify([r, ...bottoms])) {
              r.area = round1(r.w * r.h);
              bottoms.forEach((o) => { o.area = round1(o.w * o.h); });
            } else {
              r.h -= delta;
              bottoms.forEach((o, i) => { o.y = snap[i].y; o.h = snap[i].h; });
            }
          }
        }
      }
    }
  }
}
'''
src = src[:old_fix.start()] + new_fix + src[old_fix.end():]

open(P, "w", encoding="utf-8").write(src)
print("OK")
