import re

P = "/home/daytona/codebase/src/convex/planEngine.ts"
src = open(P, encoding="utf-8").read()

def rep(old, new, count=1):
    global src
    n = src.count(old)
    if n < count:
        raise SystemExit(f"NOT FOUND ({n}): {old[:80]!r}")
    src = src.replace(old, new, count)

# 1. Remove the map helpers and use a local placed array
rep(
"""  const placedIn = new Map<string, FRect[]>();
  const placedOf = (roomId: string) => placedIn.get(roomId) ?? [];
  const markPlaced = (roomId: string, rect: FRect) => {
    placedIn.set(roomId, [...placedOf(roomId), rect]);
  };

  for (const room of plan.rooms) {""",
"""  for (const room of plan.rooms) {""")

rep(
"""    const placed = placedOf(room.id);
    const doorWall""",
"""    const placed: FRect[] = [];
    const doorWall""")

rep(
"""      if (r) { push(room, kind, label, r.rect, r.angle); markPlaced(room.id, r.rect); return r.rect; }""",
"""      if (r) { push(room, kind, label, r.rect, r.angle); placed.push(r.rect); return r.rect; }""")

# nightstands
rep(
"""            if (ns1.x >= room.x + 0.12) { push(room, "table_chevet", "Chevet", ns1, 0); markPlaced(room.id, ns1); }""",
"""            if (ns1.x >= room.x + 0.12) { push(room, "table_chevet", "Chevet", ns1, 0); placed.push(ns1); }""")
rep(
"""            if (ns2.x + ns2.w <= room.x + room.w - 0.12) { push(room, "table_chevet", "Chevet", ns2, 0); markPlaced(room.id, ns2); }""",
"""            if (ns2.x + ns2.w <= room.x + room.w - 0.12) { push(room, "table_chevet", "Chevet", ns2, 0); placed.push(ns2); }""")

# ilot
rep(
"""              push(room, "ilot", "Îlot", ilot, 0); markPlaced(room.id, ilot);""",
"""              push(room, "ilot", "Îlot", ilot, 0); placed.push(ilot);""")

# douche corner
rep(
"""          if (corner) { push(room, "douche", "Douche", corner.rect, 0); markPlaced(room.id, corner.rect); }""",
"""          if (corner) { push(room, "douche", "Douche", corner.rect, 0); placed.push(corner.rect); }""")

# fauteuils
rep(
"""                push(room, "fauteuil", "Fauteuil", fa, 0); markPlaced(room.id, fa);""",
"""                push(room, "fauteuil", "Fauteuil", fa, 0); placed.push(fa);""")
rep(
"""                push(room, "fauteuil", "Fauteuil", fa2, 0); markPlaced(room.id, fa2);""",
"""                push(room, "fauteuil", "Fauteuil", fa2, 0); placed.push(fa2);""")

# table basse
rep(
"""              push(room, "table_basse", "Table basse", tb, 0); markPlaced(room.id, tb);""",
"""              push(room, "table_basse", "Table basse", tb, 0); placed.push(tb);""")

# table repas
rep(
"""          push(room, "table", "Table", table, 0); markPlaced(room.id, table);""",
"""          push(room, "table", "Table", table, 0); placed.push(table);""")

# chaises repas
rep(
"""            push(room, "chaise", "Chaise", ch, 0); markPlaced(room.id, ch);""",
"""            push(room, "chaise", "Chaise", ch, 0); placed.push(ch);""")

# chaise bureau
rep(
"""              push(room, "chaise", "Chaise", ch, 0); markPlaced(room.id, ch);""",
"""              push(room, "chaise", "Chaise", ch, 0); placed.push(ch);""")

open(P, "w", encoding="utf-8").write(src)
print("OK - all replacements applied")
