"use client";

import { useEffect } from "react";

/**
 * Registers the ODC service worker so the site becomes an installable PWA.
 * Drop <PWARegister /> into your layout (inside <body>).
 */
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.log("SW registration skipped:", err));
    };

    // register after load so it never blocks first paint
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
