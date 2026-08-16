"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { MessageCircle, X, Send, Sparkles, Shield } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const MEMBER_SUGGESTIONS_EN = [
  "How do I raise SOS?",
  "Where is family census?",
  "How does Care work?",
  "Forgot M-PIN?",
];
const MEMBER_SUGGESTIONS_HI = [
  "SOS कैसे करें?",
  "जनगणना कहाँ है?",
  "Care कैसे काम करता है?",
  "M-PIN भूल गए?",
];
const GOD_SUGGESTIONS_EN = [
  "Enable stage 3",
  "How many users",
  "Verify all pending",
  "List pending",
];
const GOD_SUGGESTIONS_HI = [
  "Stage 3 enable करो",
  "Kitne users hain",
  "Sab pending verify करो",
  "List pending",
];

function peekIsSuperAdmin() {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("matang_me_cache") || sessionStorage.getItem("matang_me_cache");
    if (!raw) return false;
    const u = JSON.parse(raw)?.user;
    return u?.role === "super_admin";
  } catch {
    return false;
  }
}

export function MatangAI() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const { user } = useCurrentUser();
  const isSuper = user?.role === "super_admin" || (!user && peekIsSuperAdmin());
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [godMode, setGodMode] = useState(() => peekIsSuperAdmin());
  const endRef = useRef<HTMLDivElement>(null);
  const hi = lang === "hi" || lang === "cg";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  useEffect(() => {
    setGodMode(isSuper);
  }, [isSuper]);

  if (["/", "/login", "/register"].includes(pathname || "") || pathname?.startsWith("/u/")) {
    return null;
  }

  const suggestions = isSuper
    ? hi
      ? GOD_SUGGESTIONS_HI
      : GOD_SUGGESTIONS_EN
    : hi
      ? MEMBER_SUGGESTIONS_HI
      : MEMBER_SUGGESTIONS_EN;

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: message }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, lang, history: next.slice(-8) }),
      });
      const data = await res.json();
      if (typeof data.godMode === "boolean") setGodMode(data.godMode);
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              data.error ||
              (hi ? "कृपया लॉगिन करके फिर कोशिश करें।" : "Please login and try again."),
          },
        ]);
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "…" }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: hi ? "नेटवर्क त्रुटि। फिर कोशिश करें।" : "Network error. Try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fabClass = isSuper
    ? "fixed bottom-16 left-3 md:bottom-20 md:left-6 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-700/50 to-indigo-900/50 text-amber-300 shadow-lg shadow-purple-900/30 ring-1 ring-purple-400/40 backdrop-blur-sm opacity-50 hover:opacity-90"
    : "fixed bottom-16 left-3 md:bottom-20 md:left-6 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-matang-navy/50 text-matang-gold shadow-lg ring-1 ring-matang-gold/40 backdrop-blur-sm opacity-50 hover:opacity-90";

  const panelClass = isSuper
    ? "fixed bottom-32 left-3 right-3 md:left-6 md:right-auto md:w-[380px] z-50 rounded-2xl overflow-hidden border border-purple-400/40 shadow-2xl bg-gradient-to-b from-[#1a1033]/95 to-[#0d0820]/98 backdrop-blur-xl"
    : "fixed bottom-32 left-3 right-3 md:left-6 md:right-auto md:w-[380px] z-50 rounded-2xl overflow-hidden border border-matang-gold/30 shadow-2xl bg-white";

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className={fabClass} title="Matang AI" aria-label="Open Matang AI">
          {isSuper ? <Shield size={24} /> : <Sparkles size={24} />}
        </button>
      )}

      {open && (
        <div className={panelClass}>
          <div
            className={
              isSuper
                ? "px-4 py-3 flex items-center justify-between bg-purple-900/80 text-amber-200"
                : "px-4 py-3 flex items-center justify-between bg-matang-navy text-white"
            }
          >
            <div className="flex items-center gap-2 min-w-0">
              {isSuper ? <Shield size={18} /> : <MessageCircle size={18} className="text-matang-gold" />}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">
                  {isSuper ? "Matang AI · God Mode" : "Matang AI"}
                </p>
                <p className={`text-[10px] ${isSuper ? "text-amber-200/70" : "text-white/60"}`}>
                  {isSuper
                    ? hi
                      ? "Super Admin कॉपायलट"
                      : "Super Admin copilot"
                    : hi
                      ? "समुदाय सहायक"
                      : "Community helper"}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
              <X size={18} />
            </button>
          </div>

          <div className={`h-64 overflow-y-auto p-3 space-y-2 ${isSuper ? "text-purple-50" : ""}`}>
            {messages.length === 0 && (
              <div className={`text-xs space-y-2 ${isSuper ? "text-purple-200/80" : "text-gray-500"}`}>
                <p>
                  {isSuper
                    ? hi
                      ? "God Mode: command लिखो — Enable stage 3, Verify all, Post notice: ..., How many users, What is ..."
                      : "God Mode: type commands — Enable stage 3, Verify all, Post notice: ..., How many users, What is ..."
                    : hi
                      ? "Census, SOS, Jobs, Care, Feed, Profile — पूछें।"
                      : "Ask about Census, SOS, Jobs, Care, Feed, Profile."}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className={
                        isSuper
                          ? "text-[11px] px-2 py-1 rounded-full bg-purple-500/30 text-amber-100 border border-purple-400/30"
                          : "text-[11px] px-2 py-1 rounded-full bg-matang-cream text-matang-navy border border-gray-200"
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm px-3 py-2 rounded-2xl max-w-[90%] whitespace-pre-wrap ${
                  m.role === "user"
                    ? isSuper
                      ? "ml-auto bg-purple-600 text-white"
                      : "ml-auto bg-matang-navy text-white"
                    : isSuper
                      ? "bg-purple-950/60 text-purple-50 border border-purple-500/30"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <p className={`text-xs ${isSuper ? "text-purple-300" : "text-gray-400"}`}>
                {hi ? "सोच रहा हूँ…" : "Thinking…"}
              </p>
            )}
            <div ref={endRef} />
          </div>

          <div className={`p-2 flex gap-2 border-t ${isSuper ? "border-purple-500/30 bg-purple-950/40" : "border-gray-100 bg-white"}`}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={hi ? "सवाल लिखें…" : "Ask something…"}
              className={
                isSuper
                  ? "flex-1 text-sm px-3 py-2 rounded-xl bg-purple-900/50 text-purple-50 border border-purple-500/30 placeholder:text-purple-300/50 outline-none"
                  : "flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-matang-gold"
              }
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={loading}
              className={
                isSuper
                  ? "w-10 h-10 rounded-xl bg-amber-400 text-purple-950 flex items-center justify-center disabled:opacity-50"
                  : "w-10 h-10 rounded-xl bg-matang-gold text-matang-navy flex items-center justify-center disabled:opacity-50"
              }
            >
              <Send size={18} />
            </button>
          </div>
          {godMode && isSuper && (
            <p className="text-[9px] text-center text-amber-200/50 pb-1">God Mode · Super Admin only</p>
          )}
        </div>
      )}
    </>
  );
}
