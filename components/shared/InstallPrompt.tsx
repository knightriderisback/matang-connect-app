"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * Shows “Install Matang Connect” when the browser fires beforeinstallprompt
 * (Chrome/Edge Android). iOS shows manual “Add to Home Screen” hint.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as any).standalone) return; // iOS already installed

    const dismissed = localStorage.getItem("matang-pwa-dismiss");
    if (dismissed === "1") return;

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIos) {
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
    localStorage.setItem("matang-pwa-dismiss", "1");
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
    <div className="fixed bottom-20 left-3 right-3 z-[60] max-w-lg mx-auto md:left-auto md:right-6 md:w-80">
      <div className="bg-matang-navy text-white rounded-2xl shadow-xl p-4 border border-matang-gold/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-matang-gold/20 flex items-center justify-center shrink-0">
            <Download size={20} className="text-matang-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Install Matang Connect</p>
            {iosHint ? (
              <p className="text-[11px] text-white/70 mt-1">
                Safari: Share → <strong>Add to Home Screen</strong>
              </p>
            ) : (
              <p className="text-[11px] text-white/70 mt-1">
                Add to home screen for app-like experience
              </p>
            )}
            <div className="flex gap-2 mt-3">
              {!iosHint && deferred && (
                <button
                  type="button"
                  onClick={install}
                  className="flex-1 py-2 rounded-xl bg-matang-gold text-matang-navy text-xs font-bold"
                >
                  Install
                </button>
              )}
              <button
                type="button"
                onClick={dismiss}
                className="px-3 py-2 rounded-xl bg-white/10 text-xs font-medium"
              >
                Later
              </button>
            </div>
          </div>
          <button type="button" onClick={dismiss} className="text-white/50 p-0.5">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
