import { useDirection } from "@/hooks/use-direction";

/**
 * Applique la direction de lecture à la racine du document.
 *
 * Monté une seule fois, au plus haut niveau de l'application : `dir`, `lang` et
 * les classes `rtl` / `ltr` suivent la langue choisie, y compris après un
 * changement à chaud (aucun rechargement). Les styles RTL existants
 * (`src/index.css`, `html.rtl …`) s'appliquent alors à tous les écrans.
 */
export function LanguageDirectionSync() {
  useDirection();
  return null;
}

export default LanguageDirectionSync;
