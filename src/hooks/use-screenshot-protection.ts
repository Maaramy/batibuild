import { useEffect, useRef } from "react";

/**
 * Hook that adds multiple layers of screenshot protection to a target element.
 * Note: This cannot 100% prevent screenshots (OS-level tools bypass the browser),
 * but it adds friction and deters casual sharing.
 *
 * Protections:
 * - Blocks right-click context menu on the element
 * - Blurs the element when the browser tab loses focus
 * - Prevents printing the page via CSS
 * - Injects a subtle repeating watermark as a pseudo-element
 * - Prevents text selection
 */
export function useScreenshotProtection<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // ── 1. Blocage du clic droit ──
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener("contextmenu", handleContextMenu);

    // ── 2. Flou lors du changement de visibilité ──
    const handleVisibilityChange = () => {
      if (!el) return;
      if (document.hidden) {
        el.classList.add("bb-protected-blur");
        // Also modify the page title as a deterrent
        const originalTitle = document.title;
        document.title = "batibuild - Estimation prot\u00e9g\u00e9e";
        setTimeout(() => { document.title = originalTitle; }, 3000);
      } else {
        el.classList.remove("bb-protected-blur");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // ── 3. Flou quand l'utilisateur minimise la fenêtre ou change d'app ──
    const handleBlur = () => {
      if (!el) return;
      el.classList.add("bb-protected-blur");
      // Auto-clear after 3s if window gets focus back
      setTimeout(() => {
        if (document.hasFocus()) {
          el?.classList.remove("bb-protected-blur");
        }
      }, 3000);
    };
    const handleFocus = () => {
      el?.classList.remove("bb-protected-blur");
    };
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    // ── 4. Détection tentative de copie ──
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener("copy", handleCopy);
    el.addEventListener("cut", handleCopy);

    // ── 5. Détection tentative d'impression ──
    const handleBeforePrint = () => {
      el?.classList.add("bb-protected-print");
    };
    const handleAfterPrint = () => {
      el?.classList.remove("bb-protected-print");
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    // ── 6. Keyboard shortcut prevention for common screenshot keys ──
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrtScn (PrintScreen) - keyCode 44
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        // Show a brief deterrent toast-like effect
        const flash = document.createElement("div");
        flash.className = "bb-protected-flash";
        flash.textContent = "\u26a0\ufe0f Capture d'\u00e9cran non autoris\u00e9e";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 1500);
        return false;
      }
      // Ctrl+Shift+PrtScn / Cmd+Shift+3 / Cmd+Shift+4 (macOS screenshots)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "3" || e.key === "4")) {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // ── Cleanup ──
    return () => {
      el.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      el.removeEventListener("copy", handleCopy);
      el.removeEventListener("cut", handleCopy);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.removeEventListener("keydown", handleKeyDown);
      el.classList.remove("bb-protected-blur", "bb-protected-print");
    };
  }, []);

  return ref;
}

/**
 * Inject global CSS styles for the screenshot protection.
 * Call this once in your app's root component.
 */
export function injectScreenshotProtectionStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("bb-protection-styles")) return;

  const style = document.createElement("style");
  style.id = "bb-protection-styles";
  style.textContent = `
    /* ── Blur when tab hidden or window loses focus ── */
    .bb-protected-blur {
      filter: blur(8px) !important;
      -webkit-filter: blur(8px) !important;
      transition: filter 0.3s ease !important;
      pointer-events: none !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }

    /* ── Print prevention ── */
    @media print {
      .bb-protected-print,
      .bb-protected-print * {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
      }
    }

    /* ── Prevent text selection on protected elements ── */
    .bb-protected-content {
      user-select: none !important;
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
    }

    /* ── Allow selection on interactive elements (buttons, inputs) inside protected area ── */
    .bb-protected-content button,
    .bb-protected-content input,
    .bb-protected-content textarea,
    .bb-protected-content select,
    .bb-protected-content a,
    .bb-protected-content [role="button"] {
      user-select: auto !important;
      -webkit-user-select: auto !important;
    }

    /* ── Screenshot deterrent flash ── */
    .bb-protected-flash {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      padding: 8px 20px;
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.95);
      color: white;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
      animation: bbFlashAnim 0.3s ease-out;
      pointer-events: none;
    }

    @keyframes bbFlashAnim {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
      }
    }

    /* ── Watermark repeating pattern on the report background ── */
    .bb-protected-watermark::after {
      content: "batibuild - Devis estimatif - Tunisie 2026";
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      color: rgba(59, 130, 246, 0.035);
      letter-spacing: 2px;
      text-transform: uppercase;
      pointer-events: none;
      z-index: 1;
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 100px,
        rgba(59, 130, 246, 0.015) 100px,
        rgba(59, 130, 246, 0.015) 200px
      );
    }
  `;
  document.head.appendChild(style);
}
