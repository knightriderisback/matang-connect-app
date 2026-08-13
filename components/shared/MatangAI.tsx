"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS_EN = [
  "How do I raise SOS?",
  "Where is family census?",
  "How to post a notice?",
  "Forgot M-PIN?",
];
const SUGGESTIONS_HI = [
  "SOS कैसे करें?",
  "जनगणना कहाँ है?",
  "सूचना कैसे पोस्ट करें?",
  "M-PIN भूल गए?",
];

export function MatangAI() {
  const pathname = usePathname();
  const { lang, t } = useI18n();
  const { user } = useCurrentUser();
  const isSuper = user?.role === "super_admin";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const hi = lang === "hi" || lang === "cg";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  // Hide on auth / public marketing
  if (
    ["/", "/login", "/register"].includes(pathname || "") ||
    pathname?.startsWith("/u/")
  ) {
    return null;
  }

  const suggestions = hi ? SUGGESTIONS_HI : SUGGESTIONS_EN;

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
        body: JSON.stringify({
          message,
          lang,
          history: next.slice(-8),
        }),
      });
      const data = await res.json();
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
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || "…" },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: hi ? "नेटवर्क त्रुटि। फिर कोशिश करें।" : "Network error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 left-3 md:bottom-24 md:left-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-matang-navy to-blue-900 text-matang-gold shadow-xl shadow-matang-navy/40 ring-2 ring-matang-gold/40 flex items-center justify-center active:scale-90 transition-transform"
        title="Matang AI"
        aria-label="Open Matang AI"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-36 left-3 right-3 md:left-6 md:right-auto md:w-[380px] z-50 flex flex-col max-h-[min(70vh,520px)] rounded-2xl border border-matang-gold/30 bg-white shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-matang-navy to-blue-900 px-4 py-3 flex items-center gap-2 text-white shrink-0">
            <MessageCircle size={18} className="text-matang-gold" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Matang AI{isSuper ? " · God Mode" : ""}</p>
              <p className="text-[10px] text-white/60">
                {hi ? "आपका समुदाय सहायक" : "Your community assistant"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-matang-cream/40 min-h-[200px]">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 text-center py-2">
                  {hi
                    ? "नमस्ते! जनगणना, SOS, पोस्ट, नौकरी… कुछ भी पूछें।"
                    : "Namaste! Ask about census, SOS, posts, jobs…"}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-gray-200 text-matang-navy hover:border-matang-gold/50"
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
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-matang-navy text-white rounded-br-md"
                      : "bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border rounded-2xl px-3 py-2 text-xs text-gray-400">
                  {hi ? "सोच रहा हूँ…" : "Thinking…"}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="p-2 border-t bg-white flex gap-2 shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={hi ? "अपना सवाल लिखें…" : "Type your question…"}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-matang-gold"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-matang-navy text-matang-gold flex items-center justify-center disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
