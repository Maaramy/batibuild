// ============================================================================
// TÉLÉCHARGEMENT DE L'APPLICATION ANDROID — CONTRAT.
//
// Ces tests verrouillent ce qui a été demandé :
//
//   · la source officielle du téléchargement est le fichier Google Drive fourni,
//     utilisé sous sa forme « téléchargement direct » (jamais la page
//     intermédiaire `/view`) ;
//   · une fois l'application publiée sur le Play Store, les DEUX bandeaux
//     (épinglé et pied de page) basculent ensemble vers la même fiche ;
//   · le bandeau est ÉPINGLÉ en haut de la page d'accueil (en tête de la barre
//     de navigation `fixed top-0`), avec un ✕ qui le masque immédiatement ;
//   · la fermeture est mémorisée pour la SESSION seulement (nouvelle session →
//     bandeau réaffiché) et un stockage indisponible ne casse jamais le ✕ ;
//   · la page de CHARGEMENT, elle, n'affiche plus aucune bannière ;
//   · l'interface n'affiche JAMAIS l'adresse du fichier et ne déclenche aucun
//     téléchargement automatique.
// ============================================================================
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ANDROID_APP_DOWNLOAD_URL,
  ANDROID_APP_FILE_ID,
  ANDROID_APP_PACKAGE_ID,
  ANDROID_APP_PLAY_STORE_URL,
  ANDROID_APP_PUBLISHED,
  ANDROID_APP_SHARE_URL,
  APP_DOWNLOAD_BANNER_KEY,
  type BannerFlagStore,
  dismissAppDownloadBanner,
  getAppDownloadUrl,
  isAppDownloadBannerDismissed,
  resolveAppDownloadUrl,
  resolveBannerFlagStore,
  subscribeAppDownloadBanner,
} from "./appDownload";

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

/** Le lien OFFICIEL fourni par l'éditeur (source de vérité du téléchargement). */
const PROVIDED_LINK =
  "https://drive.google.com/file/d/1RlqfsjwysJiywPkz-WCPIXM5d7U8Ko6Y/view?usp=drivesdk";

/** Stockage de session simulé, sans navigateur. */
function createStore(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  } satisfies BannerFlagStore & { data: Map<string, string> };
}

/** Retire les commentaires pour ne tester que le code réellement rendu. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const read = (...segments: string[]) =>
  readFileSync(join(__dirname, "..", ...segments), "utf8");

/* ------------------------------------------------------------------ *
 * Téléchargement
 * ------------------------------------------------------------------ */

describe("lien de téléchargement officiel", () => {
  it("reprend exactement le fichier fourni", () => {
    expect(ANDROID_APP_FILE_ID).toBe("1RlqfsjwysJiywPkz-WCPIXM5d7U8Ko6Y");
    expect(ANDROID_APP_SHARE_URL).toBe(PROVIDED_LINK);
  });

  it("vise le téléchargement DIRECT, pas la page intermédiaire", () => {
    expect(ANDROID_APP_DOWNLOAD_URL).toBe(
      `https://drive.google.com/uc?export=download&id=${ANDROID_APP_FILE_ID}`,
    );
    expect(ANDROID_APP_DOWNLOAD_URL).toContain("uc?export=download");
    expect(ANDROID_APP_DOWNLOAD_URL).not.toContain("/view");
    expect(ANDROID_APP_DOWNLOAD_URL).not.toContain("usp=drivesdk");
  });
});

/* ------------------------------------------------------------------ *
 * Fiche Play Store : la cible des bandeaux dès la publication
 * ------------------------------------------------------------------ */

describe("fiche Play Store", () => {
  it("reprend l'identifiant de paquet déclaré pour la publication", () => {
    expect(ANDROID_APP_PACKAGE_ID).toBe("com.batibuild.app");
    expect(ANDROID_APP_PLAY_STORE_URL).toBe(
      `https://play.google.com/store/apps/details?id=${ANDROID_APP_PACKAGE_ID}`,
    );
  });

  it("n'est pas encore la cible : l'application n'est pas publiée", () => {
    expect(ANDROID_APP_PUBLISHED).toBe(false);
    expect(getAppDownloadUrl()).toBe(ANDROID_APP_DOWNLOAD_URL);
  });

  it("devient la cible dès la publication, sans autre changement", () => {
    expect(resolveAppDownloadUrl(true)).toBe(ANDROID_APP_PLAY_STORE_URL);
    expect(resolveAppDownloadUrl(false)).toBe(ANDROID_APP_DOWNLOAD_URL);
  });

  it("suit UN SEUL interrupteur, lu par les deux bandeaux", () => {
    // Le bandeau épinglé comme celui du pied de page lisent la même fonction :
    // basculer `ANDROID_APP_PUBLISHED` change les deux en même temps.
    expect(stripComments(read("lib", "appDownload.ts"))).toContain(
      "resolveAppDownloadUrl(ANDROID_APP_PUBLISHED)",
    );
  });
});

/* ------------------------------------------------------------------ *
 * Fermeture mémorisée pour la session (+ état partagé)
 * ------------------------------------------------------------------ */

describe("fermeture du bandeau", () => {
  it("n'est pas fermé par défaut", () => {
    const store = createStore();
    expect(isAppDownloadBannerDismissed(store)).toBe(false);
  });

  it("mémorise la fermeture pour la session", () => {
    const store = createStore();
    expect(dismissAppDownloadBanner(store)).toBe(true);
    expect(store.data.get(APP_DOWNLOAD_BANNER_KEY)).toBe("1");
    expect(isAppDownloadBannerDismissed(store)).toBe(true);
  });

  it("une nouvelle session réaffiche le bandeau", () => {
    const session1 = createStore();
    dismissAppDownloadBanner(session1);

    const session2 = createStore();
    expect(isAppDownloadBannerDismissed(session2)).toBe(false);
  });

  it("sans stockage : le bandeau s'affiche et le ✕ reste possible", () => {
    expect(isAppDownloadBannerDismissed(null)).toBe(false);
    expect(dismissAppDownloadBanner(null)).toBe(false);
  });

  it("ne lève jamais quand le stockage refuse l'accès", () => {
    const broken: BannerFlagStore = {
      getItem: () => {
        throw new Error("stockage indisponible");
      },
      setItem: () => {
        throw new Error("stockage indisponible");
      },
    };

    expect(isAppDownloadBannerDismissed(broken)).toBe(false);
    expect(dismissAppDownloadBanner(broken)).toBe(false);
  });

  it("le stockage explicite est prioritaire", () => {
    const store = createStore();
    expect(resolveBannerFlagStore(store)).toBe(store);
    expect(resolveBannerFlagStore(null)).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * État partagé (barre de navigation + contenu de la page)
 * ------------------------------------------------------------------ */

describe("visibilité partagée", () => {
  it("prévient les abonnés à la fermeture, puis se désabonne", () => {
    let calls = 0;
    const unsubscribe = subscribeAppDownloadBanner(() => {
      calls += 1;
    });

    dismissAppDownloadBanner(createStore());
    expect(calls).toBe(1);

    unsubscribe();
    dismissAppDownloadBanner(createStore());
    expect(calls).toBe(1);
  });
});

/* ------------------------------------------------------------------ *
 * Page de chargement : aucune bannière
 * ------------------------------------------------------------------ */

describe("page de chargement", () => {
  const entry = stripComments(read("main.tsx"));

  it("n'affiche aucune bannière de téléchargement", () => {
    expect(entry).not.toContain("AppDownloadBanner");
  });

  it("garde un repli de chargement simple", () => {
    const loading = entry.indexOf("function RouteLoading()");
    const nextFunction = entry.indexOf("class ToolbarErrorBoundary");
    const fallback = entry.slice(loading, nextFunction);

    expect(loading).toBeGreaterThan(-1);
    expect(fallback).toContain("Loading...");
  });
});

/* ------------------------------------------------------------------ *
 * Bandeau épinglé en haut de la page d'accueil
 * ------------------------------------------------------------------ */

describe("bandeau épinglé en haut de la page", () => {
  const banner = stripComments(read("components", "AppDownloadBanner.tsx"));

  it("cible le lien officiel, en nouvel onglet, sans exposer l'adresse", () => {
    expect(banner).toContain("getAppDownloadUrl");
    expect(banner).toContain('target="_blank"');
    expect(banner).toContain('rel="noopener noreferrer"');
    // L'URL Google Drive ne doit jamais apparaître dans l'interface.
    expect(banner).not.toContain("drive.google.com");
    expect(banner).not.toContain("uc?export=download");
    expect(banner).not.toContain("usp=drivesdk");
  });

  it("ferme immédiatement et mémorise la fermeture, sans rechargement", () => {
    expect(banner).toContain("dismissAppDownloadBanner");
    expect(banner).not.toContain("location.reload");
    expect(banner).not.toContain("window.location");
  });

  it("ne déclenche aucun téléchargement automatique", () => {
    // Aucun effet de montage : le bandeau n'agit qu'au clic de l'utilisateur.
    expect(banner).not.toContain("useEffect");
    expect(banner).not.toContain("window.open");
    expect(banner).not.toContain(".click()");
  });

  it("porte des aria-label sur le ✕ et sur la zone cliquable", () => {
    expect(banner).toContain('aria-label={t("appDownload.closeAria")}');
    expect(banner).toContain('aria-label={t("appDownload.openAria")}');
  });

  it("est compact et ne déborde pas horizontalement", () => {
    expect(banner).toContain("h-10");
    expect(banner).toContain("min-w-0");
    expect(banner).toContain("truncate");
    expect(banner).toContain("shrink-0");
  });

  it("ne s'affiche pas dans l'application Android (elle est déjà installée)", () => {
    expect(banner).toContain("useAppDownloadBannerVisible");
    expect(stripComments(read("hooks", "use-app-download-banner.ts"))).toContain(
      "IS_ANDROID_APP",
    );
  });

  it("est ÉPINGLÉ en haut de la page d'accueil, dans la barre de navigation fixe", () => {
    const landing = stripComments(read("pages", "Landing.tsx"));

    expect(landing).toContain(
      'import { AppDownloadBanner } from "@/components/AppDownloadBanner";',
    );

    // La barre de navigation est `fixed top-0` : le bandeau rendu en PREMIER
    // dans cet en-tête reste donc épinglé en haut de l'écran pendant le défilement.
    expect(landing).toContain("fixed top-0 left-0 right-0");

    const header = landing.indexOf("fixed top-0 left-0 right-0");
    const bannerIndex = landing.indexOf("<AppDownloadBanner />");
    const navRow = landing.indexOf("mx-auto flex h-16 max-w-7xl");

    expect(bannerIndex).toBeGreaterThan(header);
    expect(bannerIndex).toBeLessThan(navRow);
  });

  it("décale le haut de page pour ne rien masquer (barre + bandeau)", () => {
    const landing = stripComments(read("pages", "Landing.tsx"));

    expect(landing).toContain("useAppDownloadBannerVisible()");
    expect(landing).toContain('"pt-16"');
    expect(landing).toContain('"pt-26"');
  });

  it("le texte affiché est exactement celui demandé (fr / en / ar)", () => {
    const readMessages = (locale: string) =>
      JSON.parse(read("i18n", "locales", locale, "common.json")).appDownload as Record<
        string,
        string
      >;

    const fr = readMessages("fr");
    expect(fr.title).toBe("Téléchargez l'application batibuild");
    expect(fr.subtitle).toBe("Disponible sur Android");
    expect(fr.openAria).toBeTruthy();
    expect(fr.closeAria).toBeTruthy();

    for (const locale of ["en", "ar"]) {
      const messages = readMessages(locale);
      expect(messages.title).toBeTruthy();
      expect(messages.subtitle).toBeTruthy();
      expect(messages.openAria).toBeTruthy();
      expect(messages.closeAria).toBeTruthy();
    }
  });
});

/* ------------------------------------------------------------------ *
 * Bannière du pied de page de la page d'accueil
 * ------------------------------------------------------------------ */

describe("bannière du pied de page", () => {
  const footerBanner = stripComments(
    read("components", "AppDownloadFooterBanner.tsx"),
  );

  it("cible la MÊME cible que le bandeau épinglé, en nouvel onglet, sans exposer l'adresse", () => {
    expect(footerBanner).toContain("getAppDownloadUrl");
    expect(footerBanner).toContain('target="_blank"');
    expect(footerBanner).toContain('rel="noopener noreferrer"');
    // Ni le lien Google Drive ni la fiche Play Store ne sont écrits en dur ici :
    // la cible vient d'une source unique.
    expect(footerBanner).not.toContain("drive.google.com");
    expect(footerBanner).not.toContain("uc?export=download");
    expect(footerBanner).not.toContain("usp=drivesdk");
    expect(footerBanner).not.toContain("play.google.com");

    const pinnedBanner = stripComments(read("components", "AppDownloadBanner.tsx"));
    expect(pinnedBanner).toContain("getAppDownloadUrl");
    expect(pinnedBanner).not.toContain("play.google.com");
  });

  it("est étiquetée pour les lecteurs d'écran", () => {
    expect(footerBanner).toContain(
      "aria-label=\"Télécharger l'application batibuild pour Android\"",
    );
  });

  it("ne déclenche aucun téléchargement automatique", () => {
    expect(footerBanner).not.toContain("useEffect");
    expect(footerBanner).not.toContain("window.open");
    expect(footerBanner).not.toContain(".click()");
    expect(footerBanner).not.toContain("location.reload");
  });

  it("reste compacte, sans déborder horizontalement", () => {
    expect(footerBanner).toContain("max-w-md");
    expect(footerBanner).toContain("min-w-0");
    expect(footerBanner).toContain("truncate");
  });

  it("ne s'affiche pas dans l'application Android (elle est déjà installée)", () => {
    expect(footerBanner).toContain("IS_ANDROID_APP");
  });

  it("réutilise l'icône Google Play partagée, sans duplication", () => {
    expect(footerBanner).toContain(
      'import { GooglePlayIcon } from "@/components/GooglePlayIcon";',
    );
    expect(stripComments(read("components", "GooglePlayIcon.tsx"))).toContain(
      "export function GooglePlayIcon",
    );
  });

  it("reprend les textes du bandeau", () => {
    expect(footerBanner).toContain("Téléchargez l'application batibuild");
    expect(footerBanner).toContain("Disponible sur Android");
  });

  it("est rendue dans le pied de page de la page d'accueil", () => {
    const landing = stripComments(read("pages", "Landing.tsx"));

    expect(landing).toContain(
      'import { AppDownloadFooterBanner } from "@/components/AppDownloadFooterBanner";',
    );

    const footer = landing.indexOf("function Footer()");
    const banner = landing.indexOf("<AppDownloadFooterBanner");
    const endOfFooter = landing.indexOf("function Landing()");

    expect(footer).toBeGreaterThan(-1);
    expect(banner).toBeGreaterThan(footer);
    expect(banner).toBeLessThan(endOfFooter);
  });
});
