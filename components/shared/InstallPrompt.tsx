"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * Clean, compact PWA install hint that does not occlude the bottom navigation or content.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as any).standalone) return; // iOS standalone

    const dismissed = localStorage.getItem("matang-pwa-dismiss");
    if (dismissed === "1") return;

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIos && isSafari) {
      // Show gentle hint once for iOS Safari users
      setIosHint(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem("matang-pwa-dismiss", "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed z-[65] left-3 right-3 sm:left-auto sm:right-6 sm:w-80 transition-all animate-in slide-in-from-bottom-2 duration-300"
      style={{
        bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px) + 8px)",
      }}
    >
      <div className="bg-matang-navy/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-3.5 border border-matang-gold/30">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-matang-gold/20 flex items-center justify-center shrink-0">
            <Download size={18} className="text-matang-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-bold text-xs text-white">Install Matang Connect</p>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss banner"
                className="text-white/60 hover:text-white p-1 -mr-1 -mt-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            {iosHint ? (
              <p className="text-[11px] text-white/70 mt-0.5 leading-snug">
                Safari: Tap Share icon → <strong>Add to Home Screen</strong>
              </p>
            ) : (
              <p className="text-[11px] text-white/70 mt-0.5 leading-snug">
                Faster launch & instant offline updates
              </p>
            )}
            <div className="flex gap-2 mt-2">
              {!iosHint && deferred && (
                <button
                  type="button"
                  onClick={install}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-matang-gold text-matang-navy text-xs font-bold active:scale-95 transition-all cursor-pointer"
                >
                  Install
                </button>
              )}
              <button
                type="button"
                onClick={dismiss}
                className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white/90 active:scale-95 transition-all cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
