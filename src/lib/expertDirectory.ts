// ============================================================================
// ANNUAIRE EXPERTS — recherche et filtres (client + tests)
//
// Les métiers techniques sont désormais regroupés dans la profession
// « Professionnel » et précisés par la spécialité du profil (plombier,
// électricien, piscinier…). Ces helpers appliquent cette structure :
//   · recherche libre → nom, société, description, profession ET spécialités
//     (sans accents) : « electricien » trouve « Électricien » ;
//   · filtre profession → les anciennes valeurs plombier/electricien sont
//     rattachées à « Professionnel » (aucun profil n'est perdu) ;
//   · filtre spécialité → les professionnels dont la spécialité correspond.
// ============================================================================

import {
  EXPERT_PROFESSION_ORDER,
  expertProfessionLabel,
  expertSpecialtyLabel,
  normalizeExpertProfession,
  normalizeExpertText,
} from "./expertProfessions";

export interface DirectoryExpertLike {
  profession?: string | null;
  specialties?: string[] | null;
  displayName?: string | null;
  companyName?: string | null;
  description?: string | null;
}

/** Texte dans lequel la recherche libre de l'annuaire cherche. */
export function expertSearchText(expert: DirectoryExpertLike): string {
  return normalizeExpertText(
    [
      expert.displayName ?? "",
      expert.companyName ?? "",
      expert.description ?? "",
      expertProfessionLabel(expert.profession),
      ...(expert.specialties ?? []).map(expertSpecialtyLabel),
    ].join(" "),
  );
}

/** Recherche libre : accents et casse ignorés. */
export function expertMatchesSearch(
  expert: DirectoryExpertLike,
  query: string,
): boolean {
  const q = normalizeExpertText(query);
  if (!q) return true;
  return expertSearchText(expert).includes(q);
}

/** Filtre profession (les métiers historiques comptent comme « Professionnel »). */
export function expertMatchesProfession(
  expert: DirectoryExpertLike,
  profession: string,
): boolean {
  if (!profession) return true;
  return normalizeExpertProfession(expert.profession) === profession;
}

/** Filtre spécialité (le métier enregistré dans les spécialités du profil). */
export function expertMatchesSpecialty(
  expert: DirectoryExpertLike,
  specialty: string,
): boolean {
  if (!specialty) return true;
  return (expert.specialties ?? []).includes(specialty);
}

/** Professions réellement présentes dans l'annuaire, dans l'ordre officiel. */
export function expertProfessionOptions(
  experts: readonly DirectoryExpertLike[],
): string[] {
  const present = new Set<string>();
  for (const expert of experts) {
    if (expert.profession) present.add(normalizeExpertProfession(expert.profession));
  }
  return [...present].sort(
    (a, b) =>
      EXPERT_PROFESSION_ORDER.indexOf(a as any) -
      EXPERT_PROFESSION_ORDER.indexOf(b as any),
  );
}

/** Spécialités réellement présentes dans l'annuaire (ordre alphabétique). */
export function expertSpecialtyOptions(
  experts: readonly DirectoryExpertLike[],
): string[] {
  const present = new Set<string>();
  for (const expert of experts) {
    for (const specialty of expert.specialties ?? []) present.add(specialty);
  }
  return [...present].sort((a, b) =>
    expertSpecialtyLabel(a).localeCompare(expertSpecialtyLabel(b), "fr"),
  );
}
