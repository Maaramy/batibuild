import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useConvexAuth, useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import {
  readPushContext,
  rememberPendingPushClick,
  subscribePushContext,
  takePendingPushClick,
  type PushContext,
} from "@/lib/pushBridge";

/**
 * Enregistrement du token FCM de l'application Android et suivi des clics.
 *
 * Monté une seule fois dans l'application (à l'intérieur du routeur). Ne rend
 * rien, ne modifie aucun écran et reste totalement inerte en dehors de
 * l'application Android (aucun `window.__BATIBUILD_PUSH__`).
 *
 * · token : enregistré/mis à jour dès qu'il est publié et que l'utilisateur est
 *   connecté (rotation Firebase, déconnexion/reconnexion comprises) ;
 * · ouverture : comptée au tap réel sur la notification (jeton opaque fourni
 *   par le backend, un seul événement par notification) ;
 * · clic : compté uniquement quand la destination demandée est réellement
 *   affichée — jamais sur une simple réception.
 */
export default function PushRegistration() {
  const { isAuthenticated } = useConvexAuth();
  const location = useLocation();
  const registerToken = useMutation(api.push.registerPushToken);
  const recordEvent = useMutation(api.push.recordPushEvent);

  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;

  const contextRef = useRef<PushContext | null>(null);
  const registeredRef = useRef<string | null>(null);
  const openedRef = useRef<Set<string>>(new Set());
  const clickedRef = useRef<Set<string>>(new Set());

  const syncRegistration = useCallback(async () => {
    const context = contextRef.current;
    if (!context?.token || !authRef.current) return;
    if (registeredRef.current === context.token) return;

    try {
      await registerToken({
        fcmToken: context.token,
        platform: "android",
        deviceId: context.deviceId ?? undefined,
        permissionStatus: context.permission,
      });
      registeredRef.current = context.token;
    } catch {
      // Réseau / session : nouvelle tentative au prochain événement.
      registeredRef.current = null;
    }
  }, [registerToken]);

  useEffect(() => {
    const apply = (context: PushContext) => {
      contextRef.current = context;

      if (context.logToken) {
        // La notification ouverte est mémorisée : le clic sera attribué quand
        // la destination sera réellement affichée (voir l'effet ci-dessous).
        if (context.url) rememberPendingPushClick(context.logToken, context.url);
        if (!openedRef.current.has(context.logToken)) {
          openedRef.current.add(context.logToken);
          void recordEvent({ token: context.logToken, kind: "open" }).catch(() => {});
        }
      }

      void syncRegistration();
    };

    const initial = readPushContext();
    if (initial) apply(initial);

    const unsubscribe = subscribePushContext(apply);
    // La coque injecte l'état juste après le chargement de la page : quelques
    // relectures bornées couvrent ce décalage, sans polling continu.
    const timers = [250, 900, 2000].map((delay) =>
      window.setTimeout(() => {
        const context = readPushContext();
        if (context) apply(context);
      }, delay),
    );
    const onFocus = () => {
      const context = readPushContext();
      if (context) apply(context);
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onFocus);

    return () => {
      unsubscribe();
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onFocus);
    };
  }, [recordEvent, syncRegistration]);

  useEffect(() => {
    void syncRegistration();
  }, [isAuthenticated, location.pathname, syncRegistration]);

  // Attribution du clic : destination réellement atteinte uniquement.
  useEffect(() => {
    const token = takePendingPushClick(location.pathname, location.search);
    if (!token || clickedRef.current.has(token)) return;
    clickedRef.current.add(token);
    void recordEvent({ token, kind: "click" }).catch(() => {});
  }, [location.pathname, location.search, recordEvent]);

  return null;
}
