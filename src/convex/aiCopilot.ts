"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { vly } from "../lib/vly-integrations";
import {
  detectCalculation,
  extractMemory,
  fmtTND,
  retrieveKnowledge,
  runCalculation,
  type CalculationResult,
} from "../lib/copilotEngine";

// ============================================================================
// Construction AI Copilot — actions (runtime Node)
// La couche base de données (queries/mutations) vit dans aiCopilotDb.ts.
// ============================================================================

type Level = "simple" | "pro" | "expert";

const isPremium = (user: any): boolean =>
  user?.subscriptionPlan === "pro" ||
  user?.subscriptionPlan === "expert" ||
  user?.role === "admin";

// ── Helpers de contexte ─────────────────────────────────────────────────────

function projectContextBlock(project: any): string {
  if (!project) return "Aucun projet sélectionné (conversation générale).";
  const ce = project.costEstimate;
  const ai = project.aiAnalysis;

  const breakdownText = (ce?.breakdown || [])
    .slice()
    .sort((a: any, b: any) => (b.estimatedCost || 0) - (a.estimatedCost || 0))
    .slice(0, 8)
    .map((b: any) => `- ${b.label}: ${fmtTND(b.estimatedCost || 0)} (${b.percentage ?? 0}%)`)
    .join("\n");

  return [
    `PROJET : ${project.name}`,
    `Type : ${project.category} · Statut : ${project.status}`,
    `Surface couverte : ${project.surface ? `${project.surface} m²` : "non précisée"} · Terrain : ${project.surfaceTotale ? `${project.surfaceTotale} m²` : "non précisé"}`,
    `Étages : ${project.floors ?? 1}`,
    `Composition : ${[
      project.bedrooms ? `${project.bedrooms} chambre(s)` : "",
      project.bathrooms ? `${project.bathrooms} sdb` : "",
      project.kitchens ? `${project.kitchens} cuisine(s)` : "",
      project.livingRooms ? `${project.livingRooms} salon` : "",
      project.garages ? `${project.garages} garage(s)` : "",
      project.wcs ? `${project.wcs} WC` : "",
      project.pools ? `${project.pools} piscine(s)` : "",
    ].filter(Boolean).join(", ") || "non précisée"}`,
    `Région : ${project.region ?? "non précisée"}`,
    project.description ? `Description : ${project.description.slice(0, 300)}` : "",
    `Coût total estimé : ${ce ? fmtTND(ce.totalCost) : "non calculé"}${ce?.costPerSquareMeter ? ` (${fmtTND(ce.costPerSquareMeter)}/m²)` : ""}`,
    ce?.contingencyPercentage ? `Marge imprévus : ${ce.contingencyPercentage}%` : "",
    breakdownText ? `RÉPARTITION BUDGÉTAIRE :\n${breakdownText}` : "",
    ai?.confidence ? `Confiance de l'analyse IA : ${Math.round(ai.confidence * 100)}%` : "",
    ai?.estimatedDuration ? `Durée estimée : ${ai.estimatedDuration}` : "",
    project.predictiveInsights?.summary
      ? `Analyse prédictive : ${project.predictiveInsights.summary.slice(0, 200)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function memoryBlock(memories: any[]): string {
  if (!memories.length) return "Aucune mémoire enregistrée pour le moment.";
  return memories
    .map(
      (m) =>
        `- [${m.category ?? "décision"}] ${m.content}${m.createdAt ? ` (${new Date(m.createdAt).toLocaleDateString("fr-FR")})` : ""}`,
    )
    .join("\n");
}

function historyBlock(messages: any[]): string {
  const last = messages.slice(-8);
  if (!last.length) return "";
  return last
    .map((m) => `${m.role === "user" ? "UTILISATEUR" : "COPILOTE"}: ${m.content.slice(0, 500)}`)
    .join("\n\n");
}

function pricesBlock(prices: any[], query: string): string {
  if (!prices.length) return "";
  const q = query.toLowerCase();
  // Mots-clés de la question pour sélectionner les prix pertinents
  const tokens = q
    .replace(/[^a-zàâäéèêëîïôöùûüç' ]/gi, " ")
    .split(" ")
    .filter((t) => t.length > 2);
  const scored = prices
    .map((p) => {
      let score = 0;
      const name = `${p.name} ${p.category}`.toLowerCase();
      for (const t of tokens) if (name.includes(t)) score += 1;
      if (p.category === "main_oeuvre" && /ouvrier|main|macon|jour/.test(q)) score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, 30);
  if (!picked.some((x) => x.score > 0)) return "";
  return picked
    .map(({ p }) => `- ${p.name} : ${p.unitPrice} TND/${p.unit} [base de prix, mise à jour ${new Date(p.lastUpdated || Date.now()).toLocaleDateString("fr-FR")}]`)
    .join("\n");
}

function attachmentNotes(attachments: any[], decoded: Map<string, string>): string {
  if (!attachments?.length) return "";
  const lines: string[] = [];
  for (const att of attachments) {
    const isText = /text|json|csv|xml/.test(att.type ?? "");
    if (isText && decoded.has(att.storageId ?? "")) {
      lines.push(`[DOCUMENT TEXTE « ${att.name} » — contenu extrait]\n${(decoded.get(att.storageId) ?? "").slice(0, 3000)}`);
    } else {
      lines.push(
        `[PIÈCE JOINTE « ${att.name} » (${att.type || "fichier"}) — ${isText ? "contenu non lisible" : "document image/binaire (plan, photo, PDF)"}]\n` +
        `Si c'est un plan, une photo de chantier ou un PDF : fournis une assistance d'analyse préliminaire (éléments à vérifier, dimensions, anomalies possibles, checklist) et rappelle que la validation finale revient à un professionnel qualifié (architecte, ingénieur).`,
      );
    }
  }
  return lines.join("\n\n");
}

async function decodeAttachment(ctx: any, storageId: any): Promise<string> {
  try {
    const data = await ctx.storage.get(storageId);
    if (!data) return "";
    if (typeof data === "string") return data;
    if (typeof (data as any).text === "function") return await (data as any).text();
    if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
    return await (data as any).text?.();
  } catch {
    return "";
  }
}

// ── Prompt système ──────────────────────────────────────────────────────────

function systemPrompt(level: Level): string {
  const levelRule =
    level === "simple"
      ? "NIVEAU SIMPLE : réponses claires et courtes, peu de jargon, expliquer chaque terme technique."
      : level === "expert"
        ? "NIVEAU EXPERT : terminologie technique précise, analyse approfondie, références normatives (DTU, Eurocode, NTC), données chiffrées."
        : "NIVEAU PROFESSIONNEL : analyse détaillée et structurée, chiffres et ordres de grandeur, recommandations pratiques.";

  return [
    "Tu es « Construction AI Copilot », conseiller technique senior spécialisé en construction, génie civil, matériaux, chantiers, immobilier et infrastructures — marché tunisien et africain (prix 2026).",
    "",
    "MISSION : comprendre le contexte du projet, analyser les données de la plateforme, effectuer des calculs, comparer des solutions et proposer des recommandations personnalisées et exploitables.",
    "",
    "RÈGLES ABSOLUES :",
    "1. CONTEXTE : utilise TOUJOURS les données du projet fournies (type, surface, étages, région, budget, coût estimé, mémoire, historique de conversation). L'utilisateur ne doit jamais répéter ce que la plateforme sait déjà. Si une donnée manque, demande-la brièvement.",
    "2. FIABILITÉ : taggue chaque donnée chiffrée avec un badge de fiabilité : [DONNÉE VÉRIFIÉE], [ESTIMATION], [PRÉVISION IA], [RECOMMANDATION] ou [HYPOTHÈSE]. Ne présente JAMAIS une estimation comme une donnée certaine. Précise source et date quand c'est possible.",
    "3. ESCALADE : dès qu'une question touche à la structure, la sécurité, le dimensionnement, la réglementation ou la légalité, recommande explicitement la validation par un professionnel (architecte, ingénieur civil, ingénieur structure, bureau de contrôle, géomètre, électricien qualifié, expert immobilier) avec une ligne « ⚠ Recommandation : faire valider par ... ».",
    "4. CALCULS : si le moteur de calcul a produit un résultat (transmis dans le contexte), présente-le clairement avec ses hypothèses. Sinon, fais les calculs toi-même en montrant la formule et les hypothèses.",
    "5. MATÉRIAUX : pour une recommandation de matériau, propose 3 solutions — Économique, Optimale, Premium — avec pour chacune : prix estimé, performance, durabilité, avantages, inconvénients. Utilise les prix fournis dans la base (TND).",
    "6. COMPARATEUR : pour comparer des solutions, utilise un tableau markdown (critère | option A | option B | option C) avec prix, isolation, durabilité, entretien, score IA (sur 10).",
    "7. MÉMOIRE : si l'utilisateur exprime une décision (choix de matériau, de solution, de fournisseur, contrainte, budget), confirme en fin de réponse : « ✅ Mémorisé dans le projet ». La plateforme enregistre la décision automatiquement.",
    "8. PLAN D'ACTION : quand un problème est identifié (retard, dépassement, anomalie), propose un plan d'action structuré : cause → vérifications → actions → impact financier → nouvelle échéance.",
    "9. ANALYSE PRÉDICTIVE : pour les prévisions (risque de retard, coût final, évolution des prix), indique toujours : prévision, niveau de confiance, hypothèses, date de mise à jour.",
    "10. DOCUMENTS ET PLANS : l'analyse de pièces jointes (plans, devis, photos) est une ASSISTANCE préliminaire, jamais une validation. Distingue les observations des conclusions et rappelle la validation professionnelle.",
    "11. MULTI-PAYS : pour un pays autre que la Tunisie (Dakar, Abidjan, Casablanca...), utilise la devise et les prix locaux mentionnés, jamais les prix tunisiens.",
    "12. FORMAT : structure avec des titres **en gras**, listes à puces, tableaux markdown quand utile. Sois concis et actionnable. À la fin, ajoute une section « [SOURCES] » avec les sources utilisées (une par ligne, format : - Source: <nom>) et, si pertinent, une section « [ACTIONS] » avec des actions cliquables au format exact « - action:clé:Label » parmi : compare, calc, suppliers, report, memory.",
    "",
    levelRule,
    "",
    "Réponds en français, sauf si l'utilisateur écrit en arabe : réponds alors en arabe (tunisien courant).",
  ].join("\n");
}

// ── Réponse de repli déterministe (pas de clé IA / erreur réseau) ──────────

function fallbackReply(opts: {
  content: string;
  calc: CalculationResult | null;
  kb: any[];
  project: any;
}): string {
  const parts: string[] = [];

  if (opts.calc && opts.calc.values.length) {
    parts.push(`**${opts.calc.label}**\n\n${opts.calc.summary}\n`);
    for (const v of opts.calc.values) parts.push(`- ${v.label} : **${v.value}**`);
    parts.push(`\n_Hypothèses : ${opts.calc.assumptions.join(" · ")}_`);
  } else if (opts.kb.length) {
    const top = opts.kb[0];
    parts.push(`**${top.topic}**\n\n${top.content}`);
    if (top.reliability) parts.push(`\nFiabilité : ${top.reliability}`);
  } else {
    parts.push(
      "Je n'ai pas pu générer une réponse complète (service IA momentanément indisponible). " +
        "Voici quelques questions que je peux traiter : coût au m², quantité de béton, choix d'isolant, comparaison de matériaux, planning de chantier, rentabilité locative.",
    );
  }

  if (opts.project) {
    parts.push(
      `\n\n[SOURCES]\n- Source: Données du projet « ${opts.project.name} » (batibuild App, ${new Date().toLocaleDateString("fr-FR")})`,
    );
  }
  parts.push(
    "\n[ACTIONS]\n- action:calc:Refaire le calcul\n- action:report:Générer un rapport\n- action:memory:Ajouter à la mémoire du projet",
  );
  return parts.join("\n");
}

// ── Extraction des sources ─────────────────────────────────────────────────

function extractSources(reply: string): string[] {
  const sources: string[] = [];
  for (const line of reply.split("\n")) {
    const m = line.match(/^[-*]\s*(?:Source|source):\s*(.+)$/);
    if (m) sources.push(m[1].trim());
  }
  return sources.slice(0, 6);
}

// ============================================================================
// sendMessage — le cœur conversationnel
// ============================================================================

export const sendMessage = action({
  args: {
    sessionId: v.id("aiSessions"),
    content: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          type: v.string(),
          storageId: v.optional(v.id("_storage")),
          url: v.optional(v.string()),
          size: v.optional(v.number()),
        }),
      ),
    ),
    level: v.optional(v.union(v.literal("simple"), v.literal("pro"), v.literal("expert"))),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) throw new Error("Non connecté");
    if (!isPremium(user)) {
      throw new Error(
        "OFFRE_GRATUITE:Le module Construction AI Copilot est réservé aux forfaits Pro et Expert.",
      );
    }
    const content = args.content.trim();
    if (!content && !args.attachments?.length) throw new Error("Message vide");

    const session = await ctx.runQuery(api.aiCopilotDb.getSession, {
      sessionId: args.sessionId,
    });
    if (!session) throw new Error("Session introuvable");
    if (session.userId !== user._id) throw new Error("Accès refusé");

    // 1. Enregistrer le message utilisateur
    await ctx.runMutation(internal.aiCopilotDb.insertUserMessage, {
      sessionId: args.sessionId,
      content,
      attachments: args.attachments ?? [],
      level: args.level ?? "pro",
    });

    // 2. Contexte projet
    let project: any = null;
    if (session.projectId) {
      project = await ctx.runQuery(api.projects.getProject, {
        projectId: session.projectId,
      });
    }

    // 3. Mémoire
    const memories = await ctx.runQuery(api.aiCopilotDb.listMemories, {
      projectId: session.projectId ?? undefined,
    });

    // 4. Historique
    const history = await ctx.runQuery(api.aiCopilotDb.listMessages, {
      sessionId: args.sessionId,
    });

    // 5. RAG — base de connaissances (seedée à la première utilisation)
    let kb: any[] = [];
    try {
      const existing = await ctx.runQuery(api.aiCopilotDb.getAllKnowledge, {});
      if (!existing.length) {
        await ctx.runMutation(internal.aiCopilotDb.seedKnowledgeBase, {});
        kb = await ctx.runQuery(api.aiCopilotDb.getAllKnowledge, {});
      } else {
        kb = existing;
      }
    } catch {
      kb = [];
    }
    const relevant = retrieveKnowledge(content, kb, 6);

    // 6. Prix des matériaux (contexte réel de la plateforme)
    let prices: any[] = [];
    try {
      prices = await ctx.runQuery(api.materials.getMaterialPrices, {});
    } catch {
      prices = [];
    }

    // 7. Moteur de calcul déterministe
    const calcInput = detectCalculation(content);
    const calc = calcInput ? runCalculation(calcInput) : null;

    // 8. Pièces jointes — décodage des documents texte
    const decoded = new Map<string, string>();
    for (const att of args.attachments ?? []) {
      if (att.storageId && /text|json|csv|xml/.test(att.type ?? "")) {
        const text = await decodeAttachment(ctx, att.storageId);
        if (text) decoded.set(String(att.storageId), text.slice(0, 6000));
      }
    }

    // 9. Construire le prompt
    const userPrompt = [
      `QUESTION DE L'UTILISATEUR : ${content}`,
      "",
      "── CONTEXTE DU PROJET ──",
      projectContextBlock(project),
      "",
      "── MÉMOIRE DU PROJET ──",
      memoryBlock(memories),
      "",
      "── HISTORIQUE RÉCENT ──",
      historyBlock(history.slice(0, -1)) || "Début de conversation.",
      "",
      "── BASE DE CONNAISSANCES (extraits pertinents) ──",
      relevant.length
        ? relevant
            .map((r: any) => `### ${r.topic}\n${r.content}${r.reliability ? `\nFiabilité: ${r.reliability}` : ""}`)
            .join("\n\n")
        : "Aucun extrait pertinent trouvé.",
      "",
      "── PRIX DU MARCHÉ (TND, base de prix 2026) ──",
      pricesBlock(prices, content) || "Non disponible.",
      "",
      calc
        ? `── CALCUL EXÉCUTÉ PAR LE MOTEUR ──\n${calc.summary}\nHypothèses : ${calc.assumptions.join(" · ")}\n${calc.values.map((v) => `- ${v.label}: ${v.value}`).join("\n")}`
        : "",
      attachmentNotes(args.attachments ?? [], decoded) || "",
    ]
      .filter(Boolean)
      .join("\n");

    // 10. Appel IA
    let reply = "";
    try {
      const result = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt(args.level ?? "pro") },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        maxTokens: 1400,
      });
      if (result.success && result.data?.choices?.[0]?.message?.content) {
        reply = result.data.choices[0].message.content.trim();
      }
    } catch {
      reply = "";
    }
    if (!reply) reply = fallbackReply({ content, calc, kb: relevant, project });

    // 11. Mémoire : détecter une décision et l'enregistrer
    const memory = extractMemory(content);
    if (memory && session.projectId) {
      try {
        await ctx.runMutation(api.aiCopilotDb.addMemory, {
          projectId: session.projectId,
          content: memory.content,
          category: memory.category,
        });
        reply += `\n\n✅ **Mémorisé** : ${memory.content}`;
      } catch {
        // mémoire optionnelle
      }
    }

    // 12. Enregistrer la réponse
    const sources = extractSources(reply);
    await ctx.runMutation(internal.aiCopilotDb.insertAssistantReply, {
      sessionId: args.sessionId,
      content: reply,
      sources,
    });

    // 13. Titre de session à partir du premier message
    if (session.title === "Nouvelle conversation" || !session.title) {
      await ctx.runMutation(api.aiCopilotDb.renameSession, {
        sessionId: args.sessionId,
        title: content.slice(0, 60) || "Conversation",
      });
    }

    return { ok: true, memory: memory ?? null };
  },
});

// ============================================================================
// generateReport — rapport hebdomadaire / devis généré par l'IA
// ============================================================================

export const generateReport = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<{ content: string; sources: string[] }> => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) throw new Error("Non connecté");
    if (!isPremium(user)) {
      throw new Error(
        "OFFRE_GRATUITE:Le module Construction AI Copilot est réservé aux forfaits Pro et Expert.",
      );
    }
    const project = await ctx.runQuery(api.projects.getProject, {
      projectId: args.projectId,
    });
    if (!project) throw new Error("Projet introuvable");

    const ce = project.costEstimate;
    const memories = await ctx.runQuery(api.aiCopilotDb.listMemories, {
      projectId: args.projectId,
    });
    const sessions = await ctx.runQuery(api.aiCopilotDb.listSessions, {
      projectId: args.projectId,
    });

    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const userPrompt = [
      projectContextBlock(project),
      "",
      "── MÉMOIRE DU PROJET ──",
      memoryBlock(memories),
      "",
      `Nombre de conversations copilote : ${sessions.length}`,
      "",
      "Génère un rapport hebdomadaire de chantier structuré en markdown avec les sections :",
      "## Résumé exécutif",
      "## Avancement (prévu vs réel, en %)",
      "## Budget (dépensé, engagé, prévu — avec répartition des principaux postes)",
      "## Retards & risques (avec niveau de risque et plan d'action)",
      "## Points de vigilance / anomalies",
      "## Recommandations & prochaines étapes",
      "## Sources",
      "Ajoute les badges de fiabilité [DONNÉE VÉRIFIÉE] / [ESTIMATION] / [PRÉVISION IA] / [RECOMMANDATION]. Ne jamais présenter une estimation comme certaine. Termine par une section [SOURCES] avec des lignes « - Source: <nom> ».",
    ].join("\n");

    let content = "";
    try {
      const result = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es « Construction AI Copilot ». Tu génères des rapports de chantier professionnels et honnêtes pour le marché tunisien (prix 2026). Réponds en markdown français structuré. N'invente jamais de données : utilise uniquement celles fournies et taggue les ordres de grandeur [ESTIMATION].",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        maxTokens: 1600,
      });
      if (result.success && result.data?.choices?.[0]?.message?.content) {
        content = result.data.choices[0].message.content.trim();
      }
    } catch {
      content = "";
    }

    // Repli déterministe
    if (!content) {
      const breakdown = (ce?.breakdown || [])
        .slice()
        .sort((a: any, b: any) => (b.estimatedCost || 0) - (a.estimatedCost || 0))
        .map((b: any) => `- ${b.label} : ${fmtTND(b.estimatedCost || 0)} (${b.percentage ?? 0} %)`)
        .join("\n");
      content = [
        `# Rapport hebdomadaire — ${project.name}`,
        `Généré le ${dateStr} · Type : ${project.category} · Statut : ${project.status}`,
        "",
        "## Résumé exécutif",
        `Le projet « ${project.name} » (${project.surface ?? "surface non précisée"} m², ${project.floors ?? 1} étage(s), région ${project.region ?? "non précisée"}) est en statut « ${project.status} ». Le coût total estimé est de **${ce ? fmtTND(ce.totalCost) : "non calculé"}**${ce?.costPerSquareMeter ? ` (${fmtTND(ce.costPerSquareMeter)}/m²)` : ""}.`,
        "",
        "## Avancement",
        `Statut enregistré dans la plateforme : **${project.status}**. ${project.status === "completed" ? "L'estimation BIM est terminée et le devis de construction est disponible." : project.status === "analyzing" ? "L'analyse est en cours." : "Le projet est encore en brouillon : lancez l'analyse BIM pour obtenir l'estimation."}`,
        "",
        "## Budget",
        ce
          ? `Coût total : **${fmtTND(ce.totalCost)}** (marge imprévus ${ce.contingencyPercentage ?? 0} %).\n\nRépartition des principaux postes :\n${breakdown || "non disponible"}`
          : "Aucune estimation de coût enregistrée.",
        "",
        "## Retards & risques",
        memories.length
          ? `Mémoire du projet (${memories.length} élément(s)) :\n${memories.map((m: any) => `- [${m.category}] ${m.content}`).join("\n")}`
          : "Aucun retard ni risque signalé dans la mémoire du projet.",
        "",
        "## Recommandations & prochaines étapes",
        "1. Valider l'estimation BIM et vérifier le prix au m² par rapport aux fourchettes du marché tunisien [ESTIMATION].",
        "2. Consulter la répartition budgétaire pour identifier les postes à optimiser.",
        "3. Utiliser le Copilote IA pour comparer les matériaux et affiner les choix avant approvisionnement.",
        "",
        "[SOURCES]\n- Source: Données du projet batibuild App (" + dateStr + ")\n- Source: Base de prix Tunisie 2026",
      ].join("\n");
    }

    const sources = extractSources(content);
    return { content, sources };
  },
});
