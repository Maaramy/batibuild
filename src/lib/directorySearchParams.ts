// ============================================================================
// PARAMÈTRES DE RECHERCHE DES ANNUAIRES (experts / fournisseurs)
// ----------------------------------------------------------------------------
// Les deux annuaires partagent la même barre de recherche ET le même parcours
// de projet (`?project=…`, affiché par `ProjectJourneyNav`). Ce module pur
// construit les liens de bascule « Type : Experts / Fournisseurs » en
// conservant systématiquement :
//
//   - le contexte du projet (`project`) → Projet Journey reste affiché ;
//   - le texte recherché (`q`) et la région (`region`), communs aux deux ;
//   - le critère propre à l'annuaire cible uniquement (disponibilité pour les
//     experts, spécialités / origine « analyse matériaux » pour les
//     fournisseurs).
//
// Aucune règle métier, aucune donnée : uniquement de la construction d'URL.
// ============================================================================

/** Annuaire des experts. */
export const EXPERTS_DIRECTORY_PATH = "/dashboard/professionals-directory";

/** Annuaire des fournisseurs (même route que le parcours du projet). */
export const SUPPLIERS_DIRECTORY_PATH = "/dashboard/suppliers-directory";

export type DirectoryKind = "experts" | "suppliers";

/** Critères partagés par les deux annuaires (état d'URL). */
export interface DirectorySearchState {
  /** Contexte du projet — indispensable au parcours du projet. */
  project: string;
  /** Texte recherché. */
  q: string;
  /** Région / gouvernorat. */
  region: string;
  /** Disponibilité (experts uniquement). */
  availability: string;
  /** Spécialités fournisseur, séparées par des virgules. */
  specialty: string;
  /** Origine « analyse matériaux » (fournisseurs uniquement). */
  from: string;
}

const EMPTY_STATE: DirectorySearchState = {
  project: "",
  q: "",
  region: "",
  availability: "",
  specialty: "",
  from: "",
};

/** Chemin de l'annuaire correspondant au « Type » sélectionné. */
export function directoryPath(kind: DirectoryKind): string {
  return kind === "experts" ? EXPERTS_DIRECTORY_PATH : SUPPLIERS_DIRECTORY_PATH;
}

/** Lecture tolérante d'une query string (`URLSearchParams` ou `location.search`). */
export function readDirectorySearchParams(
  params: URLSearchParams | string | null | undefined,
): DirectorySearchState {
  const sp =
    typeof params === "string" ? new URLSearchParams(params) : params ?? new URLSearchParams();
  const get = (key: string) => (sp.get(key) ?? "").trim();
  return {
    project: get("project"),
    q: get("q"),
    region: get("region"),
    availability: get("availability"),
    specialty: get("specialty"),
    from: get("from"),
  };
}

/**
 * Lien de bascule vers l'annuaire `kind`, en conservant le projet et les
 * critères communs. Les valeurs vides sont omises (URL propre) et les critères
 * propres à l'autre annuaire ne sont pas transmis.
 */
export function directorySwitchHref(
  kind: DirectoryKind,
  state?: Partial<DirectorySearchState> | null,
): string {
  const s: DirectorySearchState = { ...EMPTY_STATE, ...(state ?? {}) };
  const sp = new URLSearchParams();
  if (s.project) sp.set("project", s.project);
  if (s.q) sp.set("q", s.q);
  if (s.region) sp.set("region", s.region);
  if (kind === "experts" && s.availability && s.availability !== "all") {
    sp.set("availability", s.availability);
  }
  if (kind === "suppliers" && s.specialty) sp.set("specialty", s.specialty);
  if (kind === "suppliers" && s.from) sp.set("from", s.from);
  const qs = sp.toString();
  return `${directoryPath(kind)}${qs ? `?${qs}` : ""}`;
}
