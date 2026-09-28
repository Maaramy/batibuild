// ============================================================================
// LOGO OFFICIEL EMBARQUÉ — garde d'intégrité
//
// Le logo officiel est embarqué en base64 dans `src/lib/brandLogo.ts` afin que
// la facture PDF soit générée à l'identique dans le navigateur ET dans l'action
// Node qui la joint aux e-mails (un module partagé ne peut pas résoudre les
// imports d'assets `?inline` du bundler Vite).
//
// Ces tests garantissent que le logo utilisé par les factures est bien le
// fichier OFFICIEL de la plateforme : même signature PNG, mêmes dimensions et
// empreinte MD5 de l'asset `src/assets/logo.png` ré-encodé sans perte. Si le
// logo officiel est remplacé un jour, ces tests échouent et rappellent qu'il
// faut régénérer le littéral — aucun logo « de substitution » ne peut donc
// s'installer silencieusement dans les factures.
// ============================================================================

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BRAND_LOGO_DATA_URL } from "./brandLogo";

const DATA_URL_PREFIX = "data:image/png;base64,";

/** Logo officiel de la plateforme (`src/assets/logo.png`). */
const OFFICIAL_LOGO = readFileSync(join(process.cwd(), "src", "assets", "logo.png"));

/** Empreinte du PNG embarqué (ré-encodage sans perte de l'asset officiel). */
const EMBEDDED_MD5 = "4ac2bf7f1d7e0e3d49ff16ffbf0a888d";

function embeddedPng(): Buffer {
  expect(BRAND_LOGO_DATA_URL.startsWith(DATA_URL_PREFIX)).toBe(true);
  return Buffer.from(BRAND_LOGO_DATA_URL.slice(DATA_URL_PREFIX.length), "base64");
}

describe("logo officiel embarqué", () => {
  it("est un PNG valide, intact et mesurable", () => {
    const png = embeddedPng();

    // Signature PNG : 89 50 4E 47 0D 0A 1A 0A
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // Bloc IHDR : longueur, type, largeur, hauteur, profondeur, type de couleur
    expect(png.readUInt32BE(8)).toBe(13);
    expect(png.toString("ascii", 12, 16)).toBe("IHDR");

    // Toute altération du littéral (copie partielle, caractère manquant…)
    // change l'empreinte : la facture ne peut pas partir avec un logo abîmé.
    expect(createHash("md5").update(png).digest("hex")).toBe(EMBEDDED_MD5);
    expect(png.length).toBe(6085);
  });

  it("reprend exactement les dimensions du logo officiel de la plateforme", () => {
    const png = embeddedPng();

    expect(png.readUInt32BE(16)).toBe(OFFICIAL_LOGO.readUInt32BE(16)); // largeur
    expect(png.readUInt32BE(20)).toBe(OFFICIAL_LOGO.readUInt32BE(20)); // hauteur
    expect(png[24]).toBe(OFFICIAL_LOGO[24]); // profondeur (8 bits)
    expect(png.readUInt32BE(16)).toBe(1024);
    expect(png.readUInt32BE(20)).toBe(1024);
  });
});
