import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { writeAuditLog } from "@/lib/audit";
import {
  tryGodAction,
  fetchPublicInfo,
  wantsWebInfo,
} from "@/lib/godActions";
import { isSuperAiOnline, querySuperAiAction } from "@/lib/superAiClient";

const SYSTEM_MEMBER = `You are Matang AI — community help assistant for Matang Connect.
Help members in simple language. Guide Census, SOS, Jobs, Care, Feed, Kosh, Profile, Scan.
Never ask for M-PIN digits. Never invent personal member data. Do not discuss Super Admin tools or action commands.
Keep answers short and polite.`;

const SYSTEM_GOD_ACTION = `You are Matang Super AI · EXCLUSIVE ACTION MODEL for the Super Admin / Platform Owner.
You are an operational action agent, NOT a simple Q&A bot. Your primary purpose is to execute real administrative changes, form building, feature toggles, and UI/database configurations:
1. Feature Flags & UI Controls: Enabling/disabling any of the 60+ platform features, toggling stages (Stage 1, 2, 3), emergency SOS, Jobs, Care, Kosh, Matrimony, Vyapar.
2. Dynamic Parivar Form Builder: Creating form sections, adding custom questions/fields (text, number, dropdown, yes_no), reordering, and configuring census forms.
3. Member Management: Verifying members, bulk approvals, M-PIN resets, member search, pending directory review.
4. Live Notices & Jobs: Publishing announcements on the home feed, posting jobs.
5. Local Super AI Kernel: Connected to the local autonomous multi-agent kernel on port 8787 for complex code generation, workflow orchestration, and workspace tasks.

When the user asks to perform an action, provide the exact executed outcome clearly and authoritatively. Be operational, concise, and confirm changes.`;

function localMember(q0: string, lang: string): string {
  const q = q0.toLowerCase();
  const hi = lang === "hi" || lang === "cg" || /[\u0900-\u097F]/.test(q0);
  if (/sos|emergency|blood/.test(q))
    return hi
      ? "SOS नीचे मेनू से खोलें → प्रकार → भेजें।"
      : "Open SOS from bottom menu → choose type → send.";
  if (/census|family|जनगणना/.test(q))
    return hi
      ? "Census खोलकर परिवार/सदस्य भरें और Save करें।"
      : "Open Census, fill family/members, Save.";
  if (/mpin|पिन|भूल/.test(q))
    return hi
      ? "M-PIN भूलने पर Volunteer/Committee से Reset M-PIN करवाएँ।"
      : "Forgot M-PIN? Ask volunteer/committee to Reset M-PIN.";
  return hi
    ? "Matang AI: Census, SOS, Jobs, Care, Feed, Profile में मदद करता हूँ।"
    : "Matang AI helps with Census, SOS, Jobs, Care, Feed, Profile.";
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Login required for Matang AI" }, { status: 401 });
    }

    const body = await request.json();
    const message = String(body.message || "").trim().slice(0, 2000);
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const lang = String(body.lang || "en").slice(0, 5);
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // STRICT PERMISSION GATE: Action Model is EXCLUSIVELY available for Super Admin
    const isSuper = session.role === "super_admin";

    // =========================================================================
    // SUPER ADMIN EXCLUSIVE ACTION ENGINE
    // =========================================================================
    if (isSuper) {
      // 1. Direct Platform Action Execution (Flags, Form Builder, DB Mutations)
      const action = await tryGodAction(message, session.userId);
      if (action.handled) {
        await writeAuditLog({
          actorId: session.userId,
          action: "ai_god_action",
          meta: { message: message.slice(0, 200) },
        });
        return NextResponse.json({
          reply: `⚡ Done (Super Admin Action Engine)\n\n${action.message}`,
          source: "god_action",
          godMode: true,
          executed: true,
        });
      }

      // 2. Local SUPER-AI Autonomous Agent Execution (Port 8787 Kernel)
      try {
        const isOnline = await isSuperAiOnline();
        if (isOnline) {
          const superAiRes = await querySuperAiAction(message, session.userId, lang);
          if (superAiRes.ok && superAiRes.reply) {
            await writeAuditLog({
              actorId: session.userId,
              action: "ai_super_ai_action",
              meta: { source: superAiRes.source },
            });
            return NextResponse.json({
              reply: superAiRes.reply,
              source: superAiRes.source,
              godMode: true,
              executed: true,
            });
          }
        }
      } catch (err) {
        console.warn("SUPER-AI local call skipped:", err);
      }

      // 3. Web Search / Public Information
      if (wantsWebInfo(message)) {
        const info = await fetchPublicInfo(
          message
            .replace(/what is|who is|tell me about|search|info about|kya hai|batao|wikipedia/gi, "")
            .trim() || message
        );
        if (info) {
          await writeAuditLog({
            actorId: session.userId,
            action: "ai_god_web",
            meta: {},
          });
          return NextResponse.json({
            reply: info,
            source: "web",
            godMode: true,
            executed: false,
          });
        }
      }
    }

    // =========================================================================
    // INTELLIGENCE MODEL EXECUTION (GEMINI / XAI / LOCAL FALLBACK)
    // =========================================================================
    const systemPrompt = isSuper ? SYSTEM_GOD_ACTION : SYSTEM_MEMBER;

    // Check Gemini API key first (generous free tier & high reasoning)
    const geminiKey = process.env.GEMINI_API_KEY;
    const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history
        .filter(
          (m: any) =>
            m && (m.role === "user" || m.role === "assistant") && m.content
        )
        .map((m: any) => ({
          role: m.role as string,
          content: String(m.content).slice(0, 2000),
        })),
      { role: "user", content: message },
    ];

    if (geminiKey) {
      const candidateModels = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"];
      for (const m of candidateModels) {
        try {
          const res = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${geminiKey}`,
              },
              body: JSON.stringify({
                model: m,
                messages,
                temperature: isSuper ? 0.3 : 0.5,
                max_tokens: isSuper ? 1200 : 450,
              }),
              signal: AbortSignal.timeout(12000),
            }
          );
          if (res.ok) {
            const data = await res.json();
            const reply =
              data?.choices?.[0]?.message?.content?.trim() ||
              (isSuper ? "Action processed." : localMember(message, lang));
            await writeAuditLog({
              actorId: session.userId,
              action: isSuper ? "ai_god_mode" : "ai_member",
              meta: { source: "gemini", model: m },
            });
            return NextResponse.json({
              reply,
              source: "gemini",
              godMode: isSuper,
              executed: isSuper,
            });
          }
        } catch (e) {
          console.error(`Gemini model ${m} call failed:`, e);
        }
      }
    }

    if (xaiKey) {
      try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${xaiKey}`,
          },
          body: JSON.stringify({
            model: "grok-2-latest",
            messages,
            temperature: isSuper ? 0.2 : 0.4,
            max_tokens: isSuper ? 700 : 450,
          }),
          signal: AbortSignal.timeout(12000),
        });
        if (res.ok) {
          const data = await res.json();
          const reply =
            data?.choices?.[0]?.message?.content?.trim() ||
            (isSuper ? "Action completed." : localMember(message, lang));
          await writeAuditLog({
            actorId: session.userId,
            action: isSuper ? "ai_god_mode" : "ai_member",
            meta: { source: "grok" },
          });
          return NextResponse.json({
            reply,
            source: "grok",
            godMode: isSuper,
            executed: isSuper,
          });
        }
      } catch (e) {
        console.error("xAI failed", e);
      }
    }

    // Super admin fallback response with full action command cheat-sheet
    if (isSuper) {
      const info = await fetchPublicInfo(message);
      if (info) {
        return NextResponse.json({
          reply: info,
          source: "web",
          godMode: true,
          executed: false,
        });
      }

      return NextResponse.json({
        reply:
          lang === "en"
            ? "Hello! I am your Super Admin Action Engine. You can speak to me naturally in English or Hinglish without any prefixes — ask me to build forms, toggle features, approve members, or manage the platform!"
            : "Namaste! Main aapka Super Admin Action Engine hoon. Aap mujhse bina kisi prefix ya command ke bilkul natural Hinglish mein baat kar sakte hain — form banana ho, feature on/off karna ho, ya members verify karne hon, bas naturally batayein!",
        source: "action_engine",
        godMode: true,
        executed: false,
      });
    }

    // Regular member safe FAQ response
    return NextResponse.json({
      reply: localMember(message, lang),
      source: "local",
      godMode: false,
      executed: false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 });
  }
}
