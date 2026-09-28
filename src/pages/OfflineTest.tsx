// ============================================================================
// PAGE DE TEST HORS LIGNE — vérifier la bannière « Connexion Internet perdue ».
//
// Cette page n'affiche PAS un aperçu à part : elle pilote la VRAIE bannière,
// celle montée une seule fois dans `src/main.tsx` et visible dans toute
// l'application. Pour cela elle reproduit exactement ce que fait un navigateur
// (ou la WebView Android) quand le réseau tombe :
//
//   1. `navigator.onLine` est forcé à `false` (propriété propre à l'instance
//      `navigator`, simplement supprimée ensuite pour rendre la main au
//      réseau réel) ;
//   2. un évènement `offline` réel est émis sur `window`.
//
// L'observateur de `src/lib/networkStatus.ts` ne voit donc aucune différence
// avec une coupure véritable : bannière rouge, compteur de coupures, file de
// reprise, puis — au retour — vérification réseau réelle et « Connexion
// rétablie » qui disparaît toute seule.
//
// Page de diagnostic interne (non référencée dans la navigation) : le texte est
// volontairement en français, comme la page 404, et les chaînes de la bannière
// restent traduites (fr / en / ar) puisqu'elles viennent du composant partagé.
//
// Le réseau est TOUJOURS rendu au navigateur en quittant la page : l'application
// ne doit jamais rester bloquée « hors ligne » après un test.
// ============================================================================
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  FlaskConical,
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/use-page-seo";
import {
  clearFailedOperation,
  getNetworkMonitor,
  registerFailedOperation,
  useNetworkStatus,
} from "@/lib/networkStatus";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Simulation de la coupure — au niveau du navigateur
 * ------------------------------------------------------------------ */

/**
 * État forcé : `null` = c'est le réseau réel qui fait foi.
 *
 * Variable de MODULE (et non état React) : `navigator.onLine` doit rester
 * cohérent même si les effets sont rejoués (React StrictMode en développement),
 * et la restauration doit fonctionner sans dépendre du cycle de vie du composant.
 */
let forcedOnline: boolean | null = null;

/** Force la coupure : `navigator.onLine = false` + évènement `offline` réel. */
function applyOfflineOverride(): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  forcedOnline = false;
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => forcedOnline === true,
  });
  window.dispatchEvent(new Event("offline"));
}

/**
 * Rend la main au réseau réel : la propriété forcée est supprimée (le getter
 * natif reprend la main) puis un évènement `online` réel est émis, ce qui
 * déclenche la vérification réseau et « Connexion rétablie ».
 */
function releaseNetworkOverride(): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  if (forcedOnline === null) return;
  forcedOnline = null;
  Reflect.deleteProperty(navigator, "onLine");
  window.dispatchEvent(new Event("online"));
}

/* ------------------------------------------------------------------ *
 * File de reprise : deux opérations de démonstration
 * ------------------------------------------------------------------ */

/** Identifiants stables : ils sont retirés de la file en quittant la page. */
const SUCCEEDING_OPERATION = "offline-test:estimation";
const FAILING_OPERATION = "offline-test:message";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ *
 * Petits blocs d'interface
 * ------------------------------------------------------------------ */

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/60 px-3 py-2">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Activity;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-border/40 bg-card/60 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function ChecklistItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span>{children}</span>
    </li>
  );
}

const PHASE_STYLES = {
  online: {
    label: "En ligne",
    icon: Wifi,
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  offline: {
    label: "Hors ligne",
    icon: WifiOff,
    className: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
  restored: {
    label: "Connexion rétablie",
    icon: Wifi,
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
} as const;

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

export default function OfflineTest() {
  usePageSEO({
    title: "Test hors ligne — batibuild",
    description:
      "Page de test interne : simuler une perte de connexion et vérifier la bannière réseau.",
  });

  const { online, phase, outageCount, pendingOperations, checking } = useNetworkStatus();
  const [forced, setForced] = useState(() => forcedOnline !== null);

  // En quittant la page : réseau rendu au navigateur et file de reprise
  // nettoyée, pour ne rien laisser derrière soi dans l'application.
  useEffect(() => {
    return () => {
      releaseNetworkOverride();
      clearFailedOperation(SUCCEEDING_OPERATION);
      clearFailedOperation(FAILING_OPERATION);
      setForced(false);
    };
  }, []);

  const cutConnection = useCallback(() => {
    applyOfflineOverride();
    setForced(true);
  }, []);

  const restoreConnection = useCallback(() => {
    releaseNetworkOverride();
    setForced(false);
  }, []);

  const addSucceedingOperation = useCallback(() => {
    registerFailedOperation(SUCCEEDING_OPERATION, async () => {
      await delay(1200); // simule l'appel serveur
      return true; // confirmation du serveur → retirée de la file
    });
  }, []);

  const addFailingOperation = useCallback(() => {
    registerFailedOperation(FAILING_OPERATION, async () => {
      await delay(800);
      return false; // pas de confirmation → reste en attente
    });
  }, []);

  const clearQueue = useCallback(() => {
    clearFailedOperation(SUCCEEDING_OPERATION);
    clearFailedOperation(FAILING_OPERATION);
  }, []);

  const phaseInfo = PHASE_STYLES[phase];
  const PhaseIcon = phaseInfo.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        {/* En-tête */}
        <header className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FlaskConical className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Test hors ligne</h1>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Simulez une perte de connexion et vérifiez la bannière réseau réelle de
              l'application — la même sur Desktop, Mobile Web et application Android.
            </p>
          </div>
        </header>

        {forced && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/50 bg-amber-400/15 px-3 py-2 text-[11px] font-medium leading-snug text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Simulation active : le réseau est forcé hors ligne. Cliquez sur
              « Rétablir la connexion » (ou quittez la page) pour rendre la main au
              réseau réel.
            </span>
          </div>
        )}

        {/* État réel observé par l'application */}
        <Section icon={Activity} title="État réseau observé">
          <div className="mt-3 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                phaseInfo.className,
              )}
            >
              <PhaseIcon className="h-3 w-3" />
              {phaseInfo.label}
            </span>
            {checking && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Vérification en cours…
              </span>
            )}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Phase" value={phase} />
            <Stat label="Connecté" value={online ? "oui" : "non"} />
            <Stat label="Coupures" value={outageCount} />
            <Stat label="En attente" value={pendingOperations} />
          </dl>
        </Section>

        {/* Simulation de la coupure */}
        <Section icon={PowerOff} title="Simuler la connexion">
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Ces boutons forcent <code className="font-mono">navigator.onLine</code> et
            émettent les évènements <code className="font-mono">offline</code> /{" "}
            <code className="font-mono">online</code> réels du navigateur : la bannière
            qui apparaît est celle de toute l'application, pas un aperçu.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={cutConnection} disabled={forced} className="gap-2">
              <PowerOff className="h-4 w-4" />
              Simuler la perte de connexion
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={restoreConnection}
              disabled={!forced}
              className="gap-2"
            >
              <Power className="h-4 w-4" />
              Rétablir la connexion
            </Button>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-border/40 bg-background/60 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>
              Pendant la simulation, les requêtes réelles vers le serveur échouent
              normalement (comme en mode avion) : la reprise ne peut aboutir qu'après
              « Rétablir la connexion ».
            </span>
          </p>
        </Section>

        {/* File de reprise */}
        <Section icon={CloudOff} title="Opérations en attente">
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Les opérations échouées sont rejouées une seule fois, séquentiellement, au
            retour du réseau. En mode hors ligne, le bloc ambre « Vos données sont
            conservées localement » les compte dans la bannière.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={addSucceedingOperation} className="gap-2">
              <CloudOff className="h-4 w-4" />
              Ajouter une opération qui aboutit
            </Button>
            <Button size="sm" variant="outline" onClick={addFailingOperation} className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Ajouter une opération qui échoue
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearQueue}
              disabled={pendingOperations === 0}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Vider la file
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void getNetworkMonitor().retryNow()}
              disabled={checking}
              className="gap-2"
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Réessayer maintenant
            </Button>
          </div>
        </Section>

        {/* Points de contrôle */}
        <Section icon={CheckCircle2} title="Ce qu'il faut vérifier">
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
            <ChecklistItem>
              Une seule bannière rouge « Connexion Internet perdue », en haut de l'écran,
              sans clignotement ni alerte en double.
            </ChecklistItem>
            <ChecklistItem>
              Elle reste affichée tant que la connexion n'est pas réellement revenue, et
              ne bloque jamais les boutons situés dessous.
            </ChecklistItem>
            <ChecklistItem>
              Les opérations en attente apparaissent dans le bloc ambre, puis leur
              compteur diminue seulement lorsque le serveur confirme.
            </ChecklistItem>
            <ChecklistItem>
              « Connexion rétablie » s'affiche quelques secondes au retour du réseau,
              puis disparaît toute seule.
            </ChecklistItem>
            <ChecklistItem>
              La session reste ouverte : une perte de connexion ne déconnecte jamais.
            </ChecklistItem>
          </ul>
          <p className="mt-4 text-[11px] leading-snug text-muted-foreground">
            Sans cette page : Chrome / Edge → DevTools (F12) → « Network » → « Offline ».
            Firefox → DevTools → « Réseau » → « Hors ligne ». Mobile et Android → mode
            avion.
          </p>
        </Section>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs">
          <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
            Retour à l'accueil
          </Link>
          <Link
            to="/dashboard"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Ouvrir le tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
