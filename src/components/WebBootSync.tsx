import { useEffect } from "react";
import { useLocation } from "react-router";
import { useConvexAuth, useQuery } from "convex/react";

import i18n from "@/i18n/config";
import { api } from "@/convex/_generated/api";
import { dashboardPathForRole } from "@/lib/profileDashboard";
import { IS_ANDROID_APP, shouldUseWebCookies } from "@/lib/runtime";
import { scheduleRoutePrefetch } from "@/lib/routePrefetch";
import { registerWebServiceWorker } from "@/lib/webServiceWorker";
import {
  clearSessionHint,
  isLanguage,
  persistLanguage,
  persistSessionHint,
  persistTheme,
  purgeBatibuildCookiesEverywhere,
  readBootHints,
  resolveThemeSetting,
} from "@/lib/webCookies";

/**
 * DÉMARRAGE RAPIDE — SESSION, PRÉFÉRENCES ET CACHE WEB.
 *
 * Composant silencieux (ne rend rien) monté une seule fois dans le routeur. Il
 * maintient les cookies Web NON SENSIBLES et le cache navigateur :
 *
 *   · langue et thème → restaurés AVANT le premier rendu (voir le script
 *     d'amorçage de `index.html`) afin d'éviter tout clignotement ;
 *   · état de connexion + type de profil → indice d'affichage et de
 *     préchargement (jamais un droit d'accès : `RequireAuth` et Convex Auth
 *     restent les seules autorités) ;
 *   · Service Worker → enregistré uniquement sur le Web de production ;
 *   · module de la page suivante → préchargé pendant un temps mort.
 *
 * EXCLUSION ANDROID : dans l'application Android, AUCUN cookie n'est lu ni
 * écrit (le magasin est désactivé dans `src/lib/webCookies.ts`) ; seuls
 * d'éventuels cookies `bb_*` résiduels sont supprimés. Aucun Service Worker,
 * aucune bannière, aucune demande de consentement : la navigation, le guide de
 * première utilisation, l'écran de démarrage et les notifications de
 * l'application ne sont pas concernés.
 */
export function WebBootSync() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  // `skip` tant que la session n'est pas établie : la page publique ne
  // déclenche donc AUCUNE requête supplémentaire (aucun appel inutile).
  const user = useQuery(api.users.currentUser, isAuthenticated ? {} : "skip");
  const location = useLocation();

  // 1) Application Android : aucun cookie Web, purge des résidus `bb_*`.
  useEffect(() => {
    if (!IS_ANDROID_APP) return;
    purgeBatibuildCookiesEverywhere();
  }, []);

  // 2) Cache avancé : Service Worker (Web de production uniquement).
  useEffect(() => {
    if (!shouldUseWebCookies()) return;
    registerWebServiceWorker();
  }, []);

  // 3) État de connexion (indice non sensible). À la déconnexion ou à
  //    l'expiration de la session, l'indice est supprimé : aucune donnée de
  //    session ne subsiste, la redirection vers la connexion reste gérée par
  //    `RequireAuth`.
  useEffect(() => {
    if (!shouldUseWebCookies() || isLoading) return;
    if (!isAuthenticated) {
      clearSessionHint();
      return;
    }
    if (user === undefined) return;
    persistSessionHint({
      role: user?.userRole ?? null,
      home: dashboardPathForRole(user?.userRole) ?? null,
    });
  }, [isAuthenticated, isLoading, user]);

  // 4) Thème : mémorisé dès qu'il change (next-themes applique la classe sur
  //    `<html>`) pour être appliqué avant le premier rendu à la visite suivante.
  useEffect(() => {
    if (!shouldUseWebCookies()) return;
    persistTheme(resolveThemeSetting());

    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => persistTheme(resolveThemeSetting()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // 5) Langue : mémorisée au changement (i18next est la source de vérité).
  useEffect(() => {
    if (!shouldUseWebCookies()) return;
    const current = i18n.resolvedLanguage ?? i18n.language;
    if (isLanguage(current)) persistLanguage(current);

    const onLanguageChanged = (language: string) => {
      if (isLanguage(language)) persistLanguage(language);
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, []);

  // 6) Préchargement du module de la page la plus probable : un utilisateur
  //    dont la session était active (ou déjà sur la page de connexion) arrive
  //    presque toujours sur le tableau de bord.
  useEffect(() => {
    if (!shouldUseWebCookies() || isAuthenticated) return;
    const hints = readBootHints();
    const isAuthPage = location.pathname === "/auth";
    if (!hints.authenticated && !isAuthPage) return;
    scheduleRoutePrefetch("dashboard");
  }, [isAuthenticated, location.pathname]);

  return null;
}

export default WebBootSync;
