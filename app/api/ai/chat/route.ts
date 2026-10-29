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
Help community members in simple, polite Hinglish (strictly Roman script, NO Devanagari).
Guide them on how to use:
- Census (Parivar Jan-Ganana): Filling family member details, saving forms.
- SOS Emergency: How to trigger emergency alerts for blood, medical, accident.
- Vanshawali: Exploring family tree, viewing living bloodlines, searching relatives.
- Jobs & Vyapar: Posting and finding community employment and local businesses.
- Care & Kosh: Senior citizen care requests and community mutual fund transparency.
- Profile & M-PIN: Managing profile, contacting committee for M-PIN reset.

Rules:
- Always reply in friendly, conversational Hinglish (Roman script only).
- Keep answers concise, clear, and helpful.
- Never ask for secret M-PIN digits.
- Never invent private member data.`;

const SYSTEM_GOD_ACTION = `You are Matang Super AI — the exclusive operational AI Action Agent for the Super Admin / Platform Owner of Matang Connect.
You are conversational, intelligent, helpful, and highly capable.
You speak naturally in fluent Hinglish (strictly Roman script, NO Devanagari).

Capabilities you oversee:
1. Feature Toggles: Turn ON/OFF features like SOS, Jobs, Care, Kosh, Matrimony, Vyapar, Dharohar, Panchang, Mahila, Polls, Arthik, Rides, Gaurav, Scan, Titles, Stage 1/2/3, or All Features.
2. Dynamic Parivar Form Builder: Create new form sections (e.g. "Form section banao: Shiksha & Rozgar"), add custom fields/questions (e.g. "Form field add karo: Annual Income in Family"), view current form configuration ("Form config dikhao").
3. Member Verification & Management: Verify members (phone or all pending: "CONFIRM verify all"), Reset M-PIN ("Reset M-PIN 9876543210 to 1234"), list pending members, view registered directory.
4. Live Notices & Jobs: Post notices on home feed, post jobs.
5. System Statistics: Report live member count, pending verification count, notices, jobs, families.
6. Community & Tech Guidance: Answer questions about Vanshawali (family tree), Census, privacy, database, design, and architecture.

Rules:
- Speak in natural, friendly, polite Hinglish (Roman script only).
- When the admin asks general or conversational questions, converse with warmth, intelligence, and clarity.
- When the admin asks to do an action, explain clearly what action will be / has been executed and how it affects the platform.`;

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

async function callNativeGemini(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  currentMessage: string,
  isSuper: boolean
): Promise<{ reply: string; model: string } | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;

  // Build alternating turn contents for Gemini Native API
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const m of history || []) {
    if (!m || !m.content || typeof m.content !== "string") continue;
    const text = m.content.trim();
    if (!text) continue;
    const role: "user" | "model" = m.role === "assistant" || m.role === "model" ? "model" : "user";
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += "\n" + text;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }
  // Gemini requires contents to start with a 'user' turn
  while (contents.length > 0 && contents[0].role !== "user") {
    contents.shift();
  }
  // Append current message
  const userText = currentMessage.trim();
  if (contents.length > 0 && contents[contents.length - 1].role === "user") {
    contents[contents.length - 1].parts[0].text += "\n" + userText;
  } else {
    contents.push({ role: "user", parts: [{ text: userText }] });
  }

  // Fast candidate models with low latency and high quality
  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
  ];

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents,
          generationConfig: {
            temperature: isSuper ? 0.3 : 0.5,
            maxOutputTokens: isSuper ? 1200 : 500,
          },
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return { reply: text, model };
        }
      } else {
        const errText = await res.text();
        console.warn(`Gemini native model ${model} HTTP ${res.status}:`, errText.slice(0, 160));
      }
    } catch (e: any) {
      console.warn(`Gemini native model ${model} failed:`, e?.message);
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
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

      // 2. Explicit Local SUPER-AI Autonomous Agent / ASI Goal Execution (Port 8787 Kernel)
      const wantsSuperAi = /^\/asi\b|orchestrat|autonomous|deep\s*reasoning|asi\s*mode/i.test(message);
      if (wantsSuperAi) {
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
    // INTELLIGENCE MODEL EXECUTION (GEMINI NATIVE / XAI / LOCAL FALLBACK)
    // =========================================================================
    const systemPrompt = isSuper ? SYSTEM_GOD_ACTION : SYSTEM_MEMBER;

    // 1. Google Gemini Native REST API (Primary high-speed intelligence engine)
    const geminiResult = await callNativeGemini(systemPrompt, history, message, isSuper);
    if (geminiResult) {
      await writeAuditLog({
        actorId: session.userId,
        action: isSuper ? "ai_god_mode" : "ai_member",
        meta: { source: "gemini_native", model: geminiResult.model },
      });
      return NextResponse.json({
        reply: geminiResult.reply,
        source: "gemini",
        godMode: isSuper,
        executed: isSuper,
      });
    }

    // 2. xAI Grok Fallback (if configured)
    const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (xaiKey) {
      try {
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
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json();
          const reply = data?.choices?.[0]?.message?.content?.trim();
          if (reply) {
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
        }
      } catch (e) {
        console.error("xAI failed", e);
      }
    }

    // 3. Local SUPER-AI fallback for Super Admin (if online)
    if (isSuper) {
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
        console.warn("SUPER-AI local fallback skipped:", err);
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
