import type { Roadmap, RoadmapProjectInput } from "@/convex/roadmapEngine";
import { fmtDate, fmtTnd } from "./projectGuideFormat";

// ─── Contenu générable des documents ────────────────────────────────────────

export function buildDocumentContent(roadmap: Roadmap, input: RoadmapProjectInput, docId: string): string {
  const L: string[] = [];
  const h = (t: string) => L.push(`\n## ${t}\n`);
  const meta = `${roadmap.project.name} · ${roadmap.project.categoryLabel}${roadmap.project.regionLabel ? ` · ${roadmap.project.regionLabel}` : ""} · ${fmtDate(Date.now())}\n`;

  switch (docId) {
    case "cahier_des_charges":
      h("Cahier des charges");
      L.push(meta);
      L.push(`Surface construite : ${roadmap.project.surface ?? "—"} m² · ${roadmap.project.floors ?? 1} niveau(x).`);
      L.push(`Budget de référence : ${fmtTnd(roadmap.budget.totalCost)}.`);
      h("Étapes de construction");
      roadmap.construction.forEach((c) => {
        L.push(`• ${c.title} (${c.dureeJours} j, ${fmtTnd(c.budgetEstime)})`);
        L.push(`  Travaux : ${c.travaux.join(" ; ")}`);
        L.push(`  Contrôles : ${c.controles.join(" ; ")}`);
      });
      break;
    case "checklist_chantier":
      h("Checklist chantier");
      L.push(meta);
      roadmap.construction.forEach((c) => L.push(`[ ] ${c.title} — ${c.controles.join(" ; ")}`));
      h("Démarches administratives");
      roadmap.adminSteps.forEach((a) => L.push(`[ ] ${a.title} (${a.organisme})`));
      break;
    case "planning":
      h("Planning des travaux");
      L.push(meta);
      roadmap.planning.forEach((t) =>
        L.push(`• ${t.title} — ${t.durationDays} j (J+${t.startDay} → J+${t.endDay}) · ${t.responsible} · ${fmtTnd(t.cost)}`),
      );
      break;
    case "budget_previsionnel":
      h("Budget prévisionnel");
      L.push(meta);
      roadmap.budget.scenarios.forEach((s) => {
        L.push(`\nScénario ${s.label} — ${fmtTnd(s.totalCost)} (${fmtTnd(s.costPerM2)}/m²)`);
        s.rows.forEach((r) => L.push(`  ${r.label} : ${r.pct} % — ${fmtTnd(r.amount)}`));
      });
      break;
    case "rapport_avancement":
      h("Rapport d'avancement");
      L.push(meta);
      L.push(`Progression globale : ${roadmap.progress} %.`);
      L.push(`Tâches : ${roadmap.summary.tasksDone}/${roadmap.summary.tasksTotal} terminées.`);
      roadmap.phases.forEach((p) => L.push(`Phase ${p.number} — ${p.title} : ${p.progress} %`));
      break;
    case "rapport_controle":
      h("Rapport de contrôle");
      L.push(meta);
      L.push(`Dépenses consommées : ${fmtTnd(roadmap.summary.budgetConsumed)} sur ${fmtTnd(roadmap.summary.plannedBudget)}.`);
      roadmap.control.issues.forEach((i) => L.push(`[${i.severity.toUpperCase()}] ${i.title} — ${i.status}`));
      roadmap.control.observations.forEach((o) => L.push(`• ${o.text} (${fmtDate(o.createdAt)})`));
      break;
    case "liste_materiaux": {
      h("Liste des matériaux");
      L.push(meta);
      const breakdown = input.costEstimate?.breakdown ?? [];
      if (!breakdown.length) {
        L.push("Aucun quantitatif disponible — lancez l'estimation du projet pour obtenir la liste détaillée.");
      }
      breakdown.forEach((b) => {
        L.push(`\n${b.label} — ${fmtTnd(b.estimatedCost)}`);
        (b.items ?? []).forEach((it) => L.push(`  ${it.name} : ${it.quantity} ${it.unit} × ${it.unitPrice} = ${fmtTnd(it.totalPrice)}`));
      });
      break;
    }
    case "demande_devis":
      h("Demande de devis");
      L.push(meta);
      L.push("Objet : consultation pour les lots suivants — veuillez fournir prix unitaires et délais.");
      roadmap.construction.forEach((c) => L.push(`• Lot ${c.order} : ${c.title} (${c.materiaux.join(", ")})`));
      L.push("\nCritères de sélection :");
      roadmap.companyCriteria.forEach((c) => L.push(`  ${c.label} : ${c.detail}`));
      break;
    case "comparatif_devis":
      h("Comparatif des devis");
      L.push(meta);
      L.push(`Tableau à remplir par lot :\n${roadmap.companyCriteria.map((c) => `| ${c.label}`).join("")}`);
      roadmap.companyCriteria.forEach((c) => L.push(`- ${c.label} : ${c.detail}`));
      break;
    case "pv_reception":
      h("Procès-verbal de réception");
      L.push(meta);
      L.push("Le soussigné, maître d'ouvrage, et l'entrepreneur, déclarent procéder à la réception des travaux.");
      L.push("Réserves éventuelles : ..........");
      L.push("Délai de levée des réserves : ..........");
      L.push("Signatures : ..........");
      break;
    case "liste_reserves":
      h("Liste des réserves");
      L.push(meta);
      L.push("[ ] Réserve — localisation : .......... / délai de levée : ..........");
      roadmap.construction.forEach((c) => L.push(`[ ] Vérifier : ${c.controles.join(" ; ")}`));
      break;
    case "rapport_final":
      h("Rapport final du projet");
      L.push(meta);
      L.push(`Progression finale : ${roadmap.progress} % · Budget : ${fmtTnd(roadmap.summary.plannedBudget)} · Durée : ${roadmap.summary.plannedDurationDays} jours.`);
      L.push(`Coût final probable (IA) : ${fmtTnd(roadmap.predictions.finalCost.estimate)} (confiance ${roadmap.predictions.finalCost.confidence} %).`);
      roadmap.phases.forEach((p) => L.push(`Phase ${p.number} — ${p.title} : ${p.progress} %`));
      break;
    default:
      h("Document");
      L.push(meta);
      L.push("Document généré depuis la feuille de route du projet.");
  }
  return L.join("\n");
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
