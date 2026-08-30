import type { RestaurantPlan } from "@/lib/restaurantPlanEngine";

const COLORS: Record<string, string> = { client: "#dbeafe", service: "#fef3c7", sanitaires: "#cffafe", exterieur: "#dcfce7" };
export function RestaurantPlan2D({ plan }: { plan: RestaurantPlan }) {
  const scale = Math.min(760 / plan.width, 520 / plan.depth);
  const pad = 54;
  return <svg viewBox={`0 0 ${plan.width * scale + pad * 2} ${plan.depth * scale + pad * 2}`} className="w-full rounded-lg border bg-stone-50" role="img" aria-label="Plan technique zoné du café restaurant">
    <text x={pad} y={20} fontSize={12} fontWeight={700}>PLAN D’AMÉNAGEMENT — échelle graphique · HSP 2,80 m</text>
    <g transform={`translate(${pad},${pad})`}>
      <rect width={plan.width * scale} height={plan.depth * scale} fill="#fff" stroke="#292524" strokeWidth={3} />
      {plan.zones.map((z) => <g key={z.id}><rect x={z.x * scale} y={z.y * scale} width={z.width * scale} height={z.depth * scale} fill={COLORS[z.zone]} stroke="#57534e" strokeWidth={1.4} /><text x={(z.x + z.width / 2) * scale} y={(z.y + z.depth / 2) * scale} textAnchor="middle" fontSize={Math.max(7, Math.min(12, scale * .18))} fontWeight={700}>{z.label}</text><text x={(z.x + z.width / 2) * scale} y={(z.y + z.depth / 2) * scale + 13} textAnchor="middle" fontSize={8}>{z.area.toFixed(1)} m²</text></g>)}
      <line x1={0} y1={(plan.depth - 1.2) * scale} x2={plan.width * scale} y2={(plan.depth - 1.2) * scale} stroke="#2563eb" strokeDasharray="5 4" /><text x={8} y={(plan.depth - 1.2) * scale - 4} fontSize={8} fill="#2563eb">axe de circulation 1,20 m min.</text>
      <text x={plan.width * scale - 4} y={-8} textAnchor="end" fontSize={9}>{plan.width.toFixed(2)} m · N ↗</text>
      <text x={-8} y={plan.depth * scale / 2} transform={`rotate(-90 -8 ${plan.depth * scale / 2})`} textAnchor="middle" fontSize={9}>{plan.depth.toFixed(2)} m</text>
    </g>
    <g transform={`translate(${pad},${plan.depth * scale + pad + 20})`} fontSize={9}><rect width={10} height={10} fill={COLORS.client}/><text x={15} y={9}>Zone client</text><rect x={95} width={10} height={10} fill={COLORS.service}/><text x={110} y={9}>Zone service</text><rect x={205} width={10} height={10} fill={COLORS.sanitaires}/><text x={220} y={9}>Sanitaires</text><rect x={300} width={10} height={10} fill={COLORS.exterieur}/><text x={315} y={9}>Terrasse</text></g>
  </svg>;
}
