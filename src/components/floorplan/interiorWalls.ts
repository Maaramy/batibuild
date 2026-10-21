import type { FloorPlan } from "@/lib/floorPlanEngine";

// ============================================================================
// OUVERTURES DES CLOISONS DONNANT SUR UN PATIO (cohérence 2D ↔ 3D)
// ----------------------------------------------------------------------------
// Une pièce encloisonnée peut s'éclairer sur un patio / une cour extérieure.
// Ces fenêtres ne sont PAS sur l'enveloppe du bâtiment : le rendu 3D ne doit
// donc pas les percer dans une façade au hasard. Ce module fournit les
// ouvertures à découper dans les cloisons intérieures, à partir des MÊMES
// données `windows` que le plan 2D (aucune ouverture inventée).
// ============================================================================

const TOL = 0.02;

export interface PlanarInterval {
  a: number;
  b: number;
}

export interface PlanarOpening extends PlanarInterval {
  /** Coordonnée fixe du mur : x pour un mur W/E, y pour un mur N/S. */
  line: number;
}

const isInteriorLine = (value: number, max: number) =>
  value > TOL && Math.abs(value - max) > TOL;

/**
 * Fenêtres posées sur une cloison intérieure (mur de cour / patio).
 * Les ouvertures de façade sont exclues : elles sont déjà percées dans
 * l'enveloppe par le rendu 3D.
 */
export function courtyardWindows(plan: FloorPlan): {
  vertical: PlanarOpening[];
  horizontal: PlanarOpening[];
} {
  const vertical: PlanarOpening[] = [];
  const horizontal: PlanarOpening[] = [];
  for (const room of plan.rooms) {
    for (const win of room.windows) {
      if (win.width <= 0.05) continue;
      if (win.wall === "W" || win.wall === "E") {
        const line = win.wall === "W" ? room.x : room.x + room.w;
        if (!isInteriorLine(line, plan.length)) continue;
        vertical.push({ line, a: room.y + win.position, b: room.y + win.position + win.width });
      } else {
        const line = win.wall === "N" ? room.y : room.y + room.h;
        if (!isInteriorLine(line, plan.width)) continue;
        horizontal.push({ line, a: room.x + win.position, b: room.x + win.position + win.width });
      }
    }
  }
  return { vertical, horizontal };
}

/**
 * Découpe un segment de cloison `[a, b]` en parties pleines et ouvertures :
 * jamais de superposition, jamais un trou hors du segment.
 */
export function cutSegment(
  a: number,
  b: number,
  openings: PlanarInterval[],
): { solids: PlanarInterval[]; cuts: PlanarInterval[] } {
  const inside = openings
    .filter((o) => o.b > a + TOL && o.a < b - TOL)
    .map((o) => ({ a: Math.max(a, o.a), b: Math.min(b, o.b) }))
    .sort((x, y) => x.a - y.a)
    .reduce<PlanarInterval[]>((acc, o) => {
      const last = acc[acc.length - 1];
      if (last && o.a <= last.b + TOL) last.b = Math.max(last.b, o.b);
      else acc.push({ ...o });
      return acc;
    }, []);

  const solids: PlanarInterval[] = [];
  let cursor = a;
  for (const opening of inside) {
    if (opening.a > cursor + TOL) solids.push({ a: cursor, b: opening.a });
    cursor = Math.max(cursor, opening.b);
  }
  if (cursor < b - TOL) solids.push({ a: cursor, b });
  return { solids, cuts: inside };
}
