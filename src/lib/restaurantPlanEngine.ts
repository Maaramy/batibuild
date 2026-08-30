export type RestaurantKind = "salle" | "comptoir" | "attente" | "terrasse" | "cuisine" | "plonge" | "stockage" | "vestiaires" | "hommes" | "femmes" | "pmr";
export type OpeningSide = "N" | "S" | "E" | "W";

export interface RestaurantZone {
  id: string;
  kind: RestaurantKind;
  label: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  area: number;
  zone: "client" | "service" | "sanitaires" | "exterieur";
  doors: { side: OpeningSide; offset: number; width: number; emergency?: boolean }[];
  windows: { side: OpeningSide; offset: number; width: number }[];
  equipment: string[];
}

export interface RestaurantPlan {
  width: number;
  depth: number;
  ceilingHeight: 2.8;
  orientation: "sud-ouest";
  zones: RestaurantZone[];
  circulationWidth: number;
  exhaustDucts: { x: number; y: number; width: number; label: string }[];
  drainagePoints: { x: number; y: number; label: string }[];
  validation: {
    noOverlap: boolean;
    circulationOk: boolean;
    serviceFlowOk: boolean;
    emergencyExitOk: boolean;
    accessibilityOk: boolean;
    score: number;
    issues: string[];
  };
}

const specs: Record<RestaurantKind, { label: string; zone: RestaurantZone["zone"]; ratio: number; equipment: string[] }> = {
  salle: { label: "Salle de restauration", zone: "client", ratio: .32, equipment: ["tables 2–4 places", "banquettes", "tables accessibles"] },
  comptoir: { label: "Comptoir / Bar", zone: "client", ratio: .09, equipment: ["plan inox", "machine café", "vitrine"] },
  attente: { label: "Accueil & attente", zone: "client", ratio: .06, equipment: ["banquette", "file d'attente"] },
  terrasse: { label: "Terrasse extérieure", zone: "exterieur", ratio: .12, equipment: ["tables extérieures", "garde-corps"] },
  cuisine: { label: "Cuisine professionnelle", zone: "service", ratio: .18, equipment: ["piano", "plans inox", "extraction", "lave-mains"] },
  plonge: { label: "Plonge", zone: "service", ratio: .06, equipment: ["bac plonge", "lave-vaisselle", "évacuation EU"] },
  stockage: { label: "Stockage & chambre froide", zone: "service", ratio: .08, equipment: ["chambre froide", "réserve sèche"] },
  vestiaires: { label: "Vestiaires personnel", zone: "service", ratio: .04, equipment: ["casiers", "lave-mains"] },
  hommes: { label: "Sanitaires hommes", zone: "sanitaires", ratio: .025, equipment: ["WC", "lavabos"] },
  femmes: { label: "Sanitaires femmes", zone: "sanitaires", ratio: .025, equipment: ["WC", "lavabos"] },
  pmr: { label: "Sanitaire PMR", zone: "sanitaires", ratio: .035, equipment: ["WC PMR", "barre d'appui", "aire de rotation 1,50 m"] },
};

const round = (n: number) => Math.round(n * 100) / 100;

export function generateRestaurantPlan(input: { area?: number; width?: number; depth?: number; type?: "cafe" | "restaurant" }): RestaurantPlan {
  const area = Math.max(80, input.area ?? 180);
  const width = input.width ?? Math.sqrt(area * 1.35);
  const depth = input.depth ?? area / width;
  const kinds: RestaurantKind[] = ["salle", "comptoir", "attente", "cuisine", "plonge", "stockage", "vestiaires", "hommes", "femmes", "pmr", "terrasse"];
  const clientKinds = new Set<RestaurantKind>(["salle", "comptoir", "attente"]);
  const serviceKinds = new Set<RestaurantKind>(["cuisine", "plonge", "stockage", "vestiaires"]);
  const usable = area * .92;
  const innerWidth = width * .62;
  const serviceWidth = width - innerWidth;
  let cursorY = 0;
  const zones: RestaurantZone[] = [];
  for (const kind of kinds) {
    const spec = specs[kind];
    const zoneArea = usable * spec.ratio;
    const isClient = clientKinds.has(kind);
    const isService = serviceKinds.has(kind);
    const colWidth = isClient ? innerWidth : isService ? serviceWidth : width;
    const h = Math.max(kind === "pmr" ? 2.2 : 1.8, zoneArea / colWidth);
    const x = isClient ? 0 : isService ? innerWidth : 0;
    const y = kind === "terrasse" ? depth : cursorY;
    const z: RestaurantZone = {
      id: `zone-${kind}`,
      kind,
      label: spec.label,
      x: round(x), y: round(y), width: round(kind === "terrasse" ? width : colWidth), depth: round(h),
      area: round((kind === "terrasse" ? width : colWidth) * h), zone: spec.zone,
      doors: [], windows: [], equipment: spec.equipment,
    };
    if (kind !== "terrasse") cursorY += h;
    if (kind === "salle" || kind === "attente") z.windows.push({ side: "S", offset: .25, width: Math.min(2.4, z.width - .5) });
    if (kind === "cuisine") z.doors.push({ side: "W", offset: .3, width: 1.2 });
    if (kind === "salle") z.doors.push({ side: "S", offset: Math.max(.4, z.width / 2 - .55), width: 1.1 });
    if (kind === "terrasse") z.doors.push({ side: "N", offset: .8, width: 1.4 });
    zones.push(z);
  }
  const plan: RestaurantPlan = {
    width: round(width), depth: round(depth + 2.6), ceilingHeight: 2.8, orientation: "sud-ouest", zones,
    circulationWidth: 1.2,
    exhaustDucts: [{ x: round(innerWidth + serviceWidth * .55), y: round(depth * .35), width: .35, label: "Conduit extraction cuisine Ø350 mm" }],
    drainagePoints: ["Plonge", "Cuisine professionnelle", "Sanitaires hommes", "Sanitaires femmes", "Sanitaire PMR"].map((label, i) => ({ x: round(innerWidth + .5 + (i % 2) * 1.2), y: round(.8 + i * .7), label })),
    validation: { noOverlap: true, circulationOk: true, serviceFlowOk: true, emergencyExitOk: true, accessibilityOk: true, score: 100, issues: [] },
  };
  plan.validation = validateRestaurantPlan(plan);
  return plan;
}

export function validateRestaurantPlan(plan: RestaurantPlan): RestaurantPlan["validation"] {
  const issues: string[] = [];
  let score = 100;
  let noOverlap = true;
  for (let i = 0; i < plan.zones.length; i++) for (let j = i + 1; j < plan.zones.length; j++) {
    const a = plan.zones[i], b = plan.zones[j];
    if (a.kind === "terrasse" || b.kind === "terrasse") continue;
    if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.depth && a.y + a.depth > b.y) { noOverlap = false; issues.push(`Chevauchement : ${a.label} / ${b.label}`); }
  }
  const circulationOk = plan.circulationWidth >= 1.2;
  if (!circulationOk) { score -= 20; issues.push("Passages inférieurs à 1,20 m"); }
  const serviceFlowOk = ["stockage", "cuisine", "plonge"].every((kind) => plan.zones.some((z) => z.kind === kind));
  if (!serviceFlowOk) { score -= 20; issues.push("Marche en avant incomplète"); }
  const emergencyExitOk = plan.zones.some((z) => z.doors.some((d) => d.emergency)) || plan.zones.some((z) => z.kind === "salle" && z.doors.length > 0);
  const accessibilityOk = plan.zones.some((z) => z.kind === "pmr" && z.width >= 1.5 && z.depth >= 2.2);
  if (!accessibilityOk) { score -= 15; issues.push("Sanitaire PMR à vérifier"); }
  return { noOverlap, circulationOk, serviceFlowOk, emergencyExitOk, accessibilityOk, score: Math.max(0, score - (noOverlap ? 0 : 30)), issues };
}
