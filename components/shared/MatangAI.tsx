"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { MessageCircle, X, Send, Sparkles, Shield } from "lucide-react";
import { effectiveRole, peekIsSuperAdmin } from "@/lib/auth/roleCache";
import { useFeatureFlags } from "@/lib/useFeatureFlags";

type Msg = { role: "user" | "assistant"; content: string };

const MEMBER_SUGGESTIONS: Record<string, string[]> = {
  en: ["How do I raise SOS?", "Where is family census?", "How does Care work?", "Forgot M-PIN?"],
  hi: ["SOS कैसे करें?", "जनगणना कहाँ है?", "Care कैसे काम करता है?", "M-PIN भूल गए?"],
  mr: ["SOS कसा करायचा?", "कुटुंब जनगणना कुठे आहे?", "Care कसे काम करते?", "M-PIN विसरलात?"],
  cg: ["SOS कइसे करबो?", "जनगणना कहां हे?", "Care कइसे काम करथे?", "M-PIN भुलाय गे?"],
  hng: ["SOS kaise karein?", "Census kahan hai?", "Care kaise kaam karta hai?", "M-PIN bhool gaye?"],
};

const GOD_SUGGESTIONS: Record<string, string[]> = {
  en: [
    "Form section banao: Education",
    "Form field add karo: Annual Income",
    "Form config dikhao",
    "Enable stage 3",
    "Live stats",
    "Verify all pending",
  ],
  hi: [
    "Form section banao: शिक्षा व रोजगार",
    "Form field add karo: वार्षिक आय",
    "Form config dikhao",
    "Stage 3 enable करो",
    "Live stats दिखाओ",
    "सब पेंडिंग verify करो",
  ],
  mr: [
    "Form section banao: शिक्षण व रोजगार",
    "Form field add karo: वार्षिक उत्पन्न",
    "Form config दाखवा",
    "Stage 3 सुरू करा",
    "Live आकडेवारी दाखवा",
    "सर्व प्रलंबित verify करा",
  ],
  cg: [
    "Form section banao: शिक्षा अउ रोजगार",
    "Form field add karo: बछर के आमदनी",
    "Form config देखव",
    "Stage 3 सुरू करव",
    "कतका मनखे हे",
    "जम्मो पेंडिंग verify करव",
  ],
  hng: [
    "Form section banao: Shiksha & Rozgar",
    "Form field add karo: Annual Income",
    "Form config dikhao",
    "Enable stage 3",
    "Live stats",
    "Verify all pending",
  ],
};

const SUBTITLE: Record<string, { god: string; member: string }> = {
  en: { god: "⚡ Action Engine · Super Admin Exclusive", member: "Community helper" },
  hi: { god: "⚡ एक्शन मॉडल · सुपर एडमिन स्पेशल", member: "समुदाय सहायक" },
  mr: { god: "⚡ ॲक्शन मॉडेल · सुपर ॲडमिन स्पेशल", member: "समाज सहाय्यक" },
  cg: { god: "⚡ एक्शन मॉडल · सुपर एडमिन स्पेशल", member: "समाज संगवारी" },
  hng: { god: "⚡ Action Engine · Super Admin Exclusive", member: "Community helper" },
};

const HINT_TEXT: Record<string, { god: string; member: string }> = {
  en: {
    god: "Action Engine: Form creation, Feature toggles, UI modifications, Member approvals, Autonomous tasks.",
    member: "Ask about Census, SOS, Jobs, Care, Feed, Profile.",
  },
  hi: {
    god: "एक्शन मॉडल: फॉर्म बनाएँ, फीचर चालू/बंद करें, UI बदलाव, सदस्य सत्यापन, ऑटोनॉमस टास्क।",
    member: "Census, SOS, Jobs, Care, Feed, Profile — पूछें।",
  },
  mr: {
    god: "ॲक्शन मॉडेल: फॉर्म तयार करा, फीचर्स सुरू/बंद, UI बदल, सभासद पडताळणी, टास्क एक्झिक्युशन.",
    member: "जनगणना, SOS, नोकऱ्या, Care, Feed बद्दल विचारा.",
  },
  cg: {
    god: "एक्शन मॉडल: फॉर्म बनावव, फीचर चालू/बंद करव, UI बदलाव, मनखे सत्यापन, ऑटोनॉमस टास्क।",
    member: "जनगणना, SOS, रोजगार, Care, Feed बारे म पूछव।",
  },
  hng: {
    god: "Action Engine: Form creation, Feature toggles, UI modifications, Member approvals, Autonomous tasks.",
    member: "Census, SOS, Jobs, Care, Feed, Profile ke baare me puchein.",
  },
};

const THINKING: Record<string, string> = {
  en: "Thinking…",
  hi: "सोच रहा हूँ…",
  mr: "विचार करत आहे…",
  cg: "सोचत हंव…",
  hng: "Thinking...",
};

const PLACEHOLDER: Record<string, string> = {
  en: "Ask Matang AI…",
  hi: "मातंग AI से पूछें…",
  mr: "मातंग AI ला विचारा…",
  cg: "मातंग AI ले पूछव…",
  hng: "Matang AI se puchein…",
};

export function MatangAI() {
  const pathname = usePathname();
  const { lang, t } = useI18n();
  const { user } = useCurrentUser();
  const role = effectiveRole(user?.role);
  const isSuper = role === "super_admin";
  const { can, loading: flagsLoading } = useFeatureFlags(role);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [godMode, setGodMode] = useState(() => peekIsSuperAdmin());
  const endRef = useRef<HTMLDivElement>(null);

  const currentLang = (lang in MEMBER_SUGGESTIONS ? lang : "hi") as keyof typeof MEMBER_SUGGESTIONS;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  useEffect(() => {
    setGodMode(isSuper);
  }, [isSuper]);

  if (["/", "/login", "/register"].includes(pathname || "") || pathname?.startsWith("/u/")) {
    return null;
  }

  // Feature Control: hide Matang AI float when Member/role View is off
  if (!flagsLoading) {
    if (isSuper) {
      if (!can("ai_god_mode_enabled") && !can("ai_member_enabled")) return null;
    } else if (!can("ai_member_enabled")) {
      return null;
    }
  }

  const suggestions = isSuper
    ? GOD_SUGGESTIONS[currentLang] || GOD_SUGGESTIONS.hi
    : MEMBER_SUGGESTIONS[currentLang] || MEMBER_SUGGESTIONS.hi;

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
              (currentLang === "en" ? "Please login and try again." : "कृपया लॉगिन करके फिर कोशिश करें।"),
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
          content: currentLang === "en" ? "Network error. Try again." : "नेटवर्क त्रुटि। फिर कोशिश करें।",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Mobile: dock above bottom bar
  const fabClass =
    "fixed z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95 " +
    (isSuper
      ? "bg-gradient-to-br from-purple-700 via-indigo-700 to-matang-navy text-amber-300 ring-2 ring-amber-400/60"
      : "bg-matang-navy text-matang-gold") +
    " left-4 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:left-6 md:bottom-6";

  const panelClass =
    "fixed z-50 rounded-2xl shadow-2xl overflow-hidden border flex flex-col transition-all " +
    (isSuper ? "border-purple-400/50 bg-slate-950/95" : "border-matang-gold/30 bg-white") +
    " left-3 right-3 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:left-6 md:right-auto md:w-96 md:bottom-20";

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className={fabClass} title="Matang AI" aria-label="Open Matang AI">
          {isSuper ? <Shield size={24} /> : <Sparkles size={24} />}
        </button>
      )}

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-45 bg-black/40 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />
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
                  {isSuper ? "Matang Super AI · Action Model" : "Matang AI"}
                </p>
                <p className={`text-[10px] ${isSuper ? "text-amber-200/70" : "text-white/60"}`}>
                  {isSuper
                    ? SUBTITLE[currentLang]?.god || SUBTITLE.hi.god
                    : SUBTITLE[currentLang]?.member || SUBTITLE.hi.member}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 active:bg-white/20 cursor-pointer"
              aria-label="Close Matang AI"
            >
              <X size={18} />
            </button>
          </div>

          <div className={`h-64 overflow-y-auto p-3 space-y-2 ${isSuper ? "text-purple-50" : ""}`}>
            {messages.length === 0 && (
              <div className={`text-xs space-y-2 ${isSuper ? "text-purple-200/80" : "text-gray-500"}`}>
                <p>
                  {isSuper
                    ? HINT_TEXT[currentLang]?.god || HINT_TEXT.hi.god
                    : HINT_TEXT[currentLang]?.member || HINT_TEXT.hi.member}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className={
                        isSuper
                          ? "text-[11px] px-2 py-1 rounded-full bg-purple-500/30 text-amber-100 border border-purple-400/30 cursor-pointer"
                          : "text-[11px] px-2 py-1 rounded-full bg-matang-cream text-matang-navy border border-gray-200 cursor-pointer"
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
                {THINKING[currentLang] || THINKING.hi}
              </p>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className={`p-2 border-t flex gap-2 ${
              isSuper ? "border-purple-400/30 bg-purple-950/40" : "border-gray-100 bg-gray-50/50"
            }`}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isSuper
                  ? currentLang === "en"
                    ? "Action command (Form, Feature, Task)..."
                    : "Action command (Form, Feature, Task)..."
                  : PLACEHOLDER[currentLang] || PLACEHOLDER.hi
              }
              disabled={loading}
              className={`flex-1 px-3 py-2 text-base sm:text-sm rounded-xl border focus:outline-none ${
                isSuper
                  ? "bg-purple-900/40 border-purple-400/40 text-white placeholder-purple-300/50"
                  : "bg-white border-gray-200 text-matang-navy placeholder:text-gray-400"
              }`}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                isSuper
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-amber-200 disabled:opacity-40"
                  : "bg-matang-navy text-white disabled:opacity-40"
              }`}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </>
      )}
    </>
  );
}

export default MatangAI;
