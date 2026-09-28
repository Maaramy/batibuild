// ============================================================================
// PAGE DE TEST HORS LIGNE — garde-fous.
//
// La page `/offline-test` force `navigator.onLine` : elle modifie donc une API
// du navigateur pour TOUTE l'application (l'observateur réseau est un
// singleton). Ces tests verrouillent le point critique : le test doit toujours
// rendre la main au réseau réel, sans quoi l'application resterait bloquée
// « hors ligne » après une simple visite.
//
// (Rendu impossible en test : `vitest` tourne en environnement `node`, sans
// DOM. On vérifie donc le source, comme les autres garde-fous du projet.)
// ============================================================================
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PAGE = join(__dirname, "OfflineTest.tsx");
const MAIN = join(__dirname, "..", "main.tsx");

const page = readFileSync(PAGE, "utf8");
const main = readFileSync(MAIN, "utf8");

describe("page de test hors ligne — garde-fous", () => {
  it("simule une coupure réelle pour l'application (et non une bannière à part)", () => {
    // Coupure : la propriété du navigateur est forcée puis l'évènement `offline`
    // RÉEL est émis — l'observateur partagé ne voit aucune différence avec une
    // vraie perte de connexion.
    expect(page).toMatch(/Object\.defineProperty\(navigator, "onLine"/);
    expect(page).toMatch(/window\.dispatchEvent\(new Event\("offline"\)\)/);
    // Retour : la propriété forcée est supprimée, le getter natif reprend la
    // main, puis `online` déclenche la vérification réseau.
    expect(page).toMatch(/Reflect\.deleteProperty\(navigator, "onLine"\)/);
    expect(page).toMatch(/window\.dispatchEvent\(new Event\("online"\)\)/);
    expect(page).toMatch(/useNetworkStatus/);
    // Aucune bannière dupliquée : c'est celle montée dans `main.tsx`.
    expect(page).not.toMatch(/NetworkStatusBanner/);
  });

  it("rend TOUJOURS le réseau au navigateur en quittant la page", () => {
    const cleanup = page.match(
      /useEffect\(\(\) => \{\s*return \(\) => \{([\s\S]*?)\};\s*\}, \[\]\);/,
    );
    expect(cleanup, "l'effet de nettoyage a disparu de la page de test").not.toBeNull();
    const body = cleanup![1];

    expect(body, "le réseau doit être rendu au navigateur").toMatch(
      /releaseNetworkOverride\(\)/,
    );
    // Rien n'est laissé dans la file de reprise de l'application.
    expect(body.match(/clearFailedOperation\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("ne déconnecte jamais l'utilisateur", () => {
    expect(page).not.toMatch(/\bsignOut\b|useAuthActions|@convex-dev\/auth/);
  });

  it("est accessible hors session via la route /offline-test", () => {
    expect(main).toMatch(/const OfflineTest = lazy\(\(\) => import\("\.\/pages\/OfflineTest\.tsx"\)\)/);
    expect(main).toMatch(/<Route path="\/offline-test" element=\{<OfflineTest \/>\} \/>/);
  });
});
