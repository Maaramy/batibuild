import { describe, it, expect, afterEach } from "vitest";

import {
  NATIVE_UNREAD_MESSAGE_TYPE,
  postUnreadCount,
  unreadCountPayload,
} from "./nativeBridge";

// ============================================================================
// PONT NATIF — pastille de la Messagerie
//
// Le compteur natif ne doit JAMAIS recevoir une valeur inventée : un état de
// chargement, une erreur de synchronisation ou une valeur non numérique ne
// publient rien (le natif conserve alors son dernier compteur fiable).
// ============================================================================

const originalWindow = (globalThis as any).window;

afterEach(() => {
  (globalThis as any).window = originalWindow;
});

describe("unreadCountPayload", () => {
  it("builds the payload expected by the Android shell", () => {
    expect(unreadCountPayload(3)).toEqual({ type: NATIVE_UNREAD_MESSAGE_TYPE, count: 3 });
  });

  it("publishes nothing while loading or on a sync error", () => {
    expect(unreadCountPayload(undefined)).toBeNull();
    expect(unreadCountPayload(null)).toBeNull();
    expect(unreadCountPayload(Number.NaN)).toBeNull();
    expect(unreadCountPayload("3")).toBeNull();
    expect(unreadCountPayload(-1)).toBeNull();
  });

  it("keeps 0 publishable so the badge can disappear when everything is read", () => {
    expect(unreadCountPayload(0)).toEqual({ type: NATIVE_UNREAD_MESSAGE_TYPE, count: 0 });
  });

  it("always sends an integer (no fractional counter)", () => {
    expect(unreadCountPayload(2.7)?.count).toBe(2);
  });
});

describe("postUnreadCount", () => {
  it("ignores the call silently when there is no native shell (web preview)", () => {
    (globalThis as any).window = {};
    expect(postUnreadCount(5)).toBe(false);
  });

  it("posts the JSON payload to the native bridge when available", () => {
    const messages: string[] = [];
    (globalThis as any).window = {
      ReactNativeWebView: { postMessage: (data: string) => messages.push(data) },
    };

    expect(postUnreadCount(42)).toBe(true);
    expect(messages).toEqual([
      JSON.stringify({ type: NATIVE_UNREAD_MESSAGE_TYPE, count: 42 }),
    ]);
  });

  it("never posts while the count is unknown", () => {
    const messages: string[] = [];
    (globalThis as any).window = {
      ReactNativeWebView: { postMessage: (data: string) => messages.push(data) },
    };

    expect(postUnreadCount(undefined)).toBe(false);
    expect(messages).toHaveLength(0);
  });
});
