// ============================================================================
// TÉLÉCHARGEMENT DE L'APPLICATION ANDROID — CONTRAT.
//
// Ces tests verrouillent ce qui a été demandé :
//
//   · la source officielle du téléchargement est le fichier Google Drive fourni,
//     utilisé sous sa forme « téléchargement direct » (jamais la page
//     intermédiaire `/view`) ;
//   · la page de CHARGEMENT n'affiche PLUS de bannière de téléchargement ;
//   · la petite bannière du PIED DE PAGE de la page d'accueil renvoie vers ce
//     même fichier, avec les mêmes textes, une `aria-label`, un débordement
//     maîtrisé (`min-w-0` + `truncate`) et aucun téléchargement automatique ;
//   · l'interface n'affiche JAMAIS l'adresse du fichier.
// ============================================================================
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ANDROID_APP_DOWNLOAD_URL,
  ANDROID_APP_FILE_ID,
  ANDROID_APP_SHARE_URL,
} from "./appDownload";

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

/** Le lien OFFICIEL fourni par l'éditeur (source de vérité du téléchargement). */
const PROVIDED_LINK =
  "https://drive.google.com/file/d/1RlqfsjwysJiywPkz-WCPIXM5d7U8Ko6Y/view?usp=drivesdk";

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
 * Page de chargement : plus aucune bannière
 * ------------------------------------------------------------------ */

describe("page de chargement", () => {
  const entry = stripComments(read("main.tsx"));

  it("n'affiche plus la bannière de téléchargement", () => {
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
 * Bannière du pied de page de la page d'accueil
 * ------------------------------------------------------------------ */

describe("bannière du pied de page", () => {
  const footerBanner = stripComments(
    read("components", "AppDownloadFooterBanner.tsx"),
  );

  it("cible le lien officiel, en nouvel onglet, sans exposer l'adresse", () => {
    expect(footerBanner).toContain("ANDROID_APP_DOWNLOAD_URL");
    expect(footerBanner).toContain('target="_blank"');
    expect(footerBanner).toContain('rel="noopener noreferrer"');
    // L'URL Google Drive ne doit jamais apparaître dans l'interface.
    expect(footerBanner).not.toContain("drive.google.com");
    expect(footerBanner).not.toContain("uc?export=download");
    expect(footerBanner).not.toContain("usp=drivesdk");
  });

  it("est étiquetée pour les lecteurs d'écran", () => {
    expect(footerBanner).toContain(
      "aria-label=\"Télécharger l'application batibuild pour Android\"",
    );
  });

  it("ne déclenche aucun téléchargement automatique", () => {
    // Aucun effet de montage : la bannière n'agit qu'au clic de l'utilisateur.
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

    for (const locale of ["en", "ar"]) {
      const messages = readMessages(locale);
      expect(messages.title).toBeTruthy();
      expect(messages.subtitle).toBeTruthy();
      expect(messages.openAria).toBeTruthy();
    }
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
