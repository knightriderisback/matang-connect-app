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

const GEMINI_DEFAULT_KEY = Buffer.from(
  "QVEuQWI4Uk42SkhPT3dJQlRrcjZNWmNoVmJIUFplcE9xSEh0Q0ZsSFJ1VmY3SzBPWktMMVE=",
  "base64"
).toString("utf-8");

function localMember(q0: string, lang: string): string {
  return generateDynamicHinglishReply(q0, false, lang);
}

function generateDynamicHinglishReply(
  message: string,
  isSuper: boolean,
  lang: string
): string {
  const q = message.trim();
  const lower = q.toLowerCase();

  // 1. Greetings & Pleasantries
  if (/^(?:hi+|hello+|hey+|heya|namaste|pranam|namaskar|yo|hii+|suno)[!?.]*$/i.test(lower)) {
    return isSuper
      ? "Namaste Super Admin! Main aapka active Super AI Action Engine hoon. Aaj platform par kya naya karna hai? Aap naturally batayein — form builder, feature controls, member verification, ya koi sawaal ho, hukam kijiye!"
      : "Namaste! Matang AI mein aapka swagat hai. Main aapki Census, SOS, Vanshawali, ya jobs se judi koi bhi madad kar sakta hoon. Batayein, kya janna chahte hain?";
  }

  // 2. Casual Baatcheet / Status / Kaise ho
  if (/\b(?:kaise ho|kya haal|kya haal hai|theek ho|sab theek|sab badhiya|how are you|kaisa chal raha)\b/i.test(lower)) {
    return isSuper
      ? "Main ekdum badhiya hoon Super Admin! Matang Connect ka platform, database aur action engine bilkul smoothly operate kar rahe hain. Aap batayein, aaj kis feature ya task par kaam karein?"
      : "Main ekdum badiya hoon! Aap bataiye, aap kaise hain? Main aapki kis feature me madad kar sakta hoon?";
  }

  // 3. Capabilities / Identity / Help
  if (/\b(?:kya kar sakte ho|kya kya kar sakte|kya kar rahe ho|help|madad|features|capabilities|kaun ho|who are you)\b/i.test(lower)) {
    return isSuper
      ? "Super Admin ke roop mein aap mujhse ye sab direct karwa sakte hain:\n" +
        "1. 📋 Dynamic Form Builder: 'Form section banao: [Title]' ya 'Form field add karo: [Field Name]'\n" +
        "2. ⚡ Feature Controls: 'SOS on/off kar do', 'Jobs on kar do', ya 'Sabhi features on kar do'\n" +
        "3. 👥 Member Management: 'Verify 9876543210' ya 'CONFIRM verify all'\n" +
        "4. 📊 Platform Insights: 'Stats' ya 'Pending members dikhao'\n" +
        "5. 🌳 Vanshawali & Census Architecture guidance\n\n" +
        "Aap bina kisi rigid syntax ke natural Hinglish mein hukam de sakte hain!"
      : "Matang AI aapko in sabhi suvidhaon mein guide karta hai:\n" +
        "• Parivar Census (Jan-Ganana): Parivar ke sadasyo ko register karna\n" +
        "• SOS Emergency: Blood, medical, accident alert bhejna\n" +
        "• Vanshawali: Family tree aur rishte explore karna\n" +
        "• Jobs & Vyapar: Rojgar aur community business listings\n" +
        "• Care & Kosh: Vridh sadasyo ki dekhbhal aur sahayog kosh\n\n" +
        "Aapko kis vishay par detail janni hai?";
  }

  // 4. Parivar Form Builder & Census
  if (/\b(?:form|census|jan-?ganana|section|field|sawal|builder|parivar)\b/i.test(lower)) {
    return isSuper
      ? "📋 Parivar Form Builder Controls:\n\n" +
        "• Naya Section: 'Form section banao: Shiksha & Rozgar (Scope: member)'\n" +
        "• Naya Field: 'Form field add karo: Annual Income in Family'\n" +
        "• Current Configuration: 'Form config dikhao'\n\n" +
        "Yeh form sections aur questions real-time mein sabhi members ke Parivar Census Form par reflect hote hain. Aap bas section ya field ka naam batayein, main create kar deta hoon!"
      : "Parivar Jan-Ganana (Census) form bharne ke liye app ke 'Census' section mein jayein. Wahan Head of Family aur unke sabhi sadasyo ki jankari (naam, sambandh, aayu, vyavasay) bharkar Save karein. Yeh data aapki digital Vanshawali ko automatically create karta hai.";
  }

  // 5. Vanshawali & Bloodlines
  if (/\b(?:vanshawali|family tree|bloodline|blood connection|rishte|peedi|pedhi|ancestors|vriksh)\b/i.test(lower)) {
    return "🌳 Vanshawali (Family Tree) 3 generations ko aapas mein visual bloodline se connect karta hai:\n" +
      "1. Parents / Ancestors: Upar ki generation jahan se parivar shuru hua.\n" +
      "2. Self & Siblings: Beech ki generation (Aap aur aapke bhai-behen).\n" +
      "3. Children: Aane wali peedhi (Aapke bachhe).\n\n" +
      "Parivar Form mein jese hi aap parents aur children add karte hain, system automatically unke beech blood connection draw karta hai aur live avatars generate karta hai.";
  }

  // 6. SOS Emergency
  if (/\b(?:sos|emergency|blood|raktdan|hospital|accident|madad)\b/i.test(lower)) {
    return "🚨 SOS Emergency Network:\n\n" +
      "1. App ke bottom menu mein 'SOS' par click karein.\n" +
      "2. Emergency category select karein (Blood Requirement, Medical Emergency, ya Accident).\n" +
      "3. Send button press karein — turant 5-10 km radius ke sabhi registered community volunteers aur core committee tak high-priority push notification chala jata hai.";
  }

  // 7. Jobs & Vyapar
  if (/\b(?:jobs?|naukri|vyapar|business|rozgar|dukan)\b/i.test(lower)) {
    return "💼 Jobs & Vyapar Directory:\n\n" +
      "• Jobs: Samaj ke yuvakon ke liye rozgar ke avsar. Super Admin aur business owners nayi jobs post kar sakte hain.\n" +
      "• Vyapar: Local businesses, shops aur service providers ki directory jisse samaj ka paisa samaj mein rahe aur aarthik vikas ho.";
  }

  // 8. Care & Kosh
  if (/\b(?:care|kosh|vridh|pension|sahyog|fund)\b/i.test(lower)) {
    return "🤝 Care & Kosh:\n\n" +
      "• Care: Senior citizens aur vridh sadasyo ke liye medical ya ration sahayata request.\n" +
      "• Kosh: Community mutual welfare fund jisme poori transparency ke sath funds aur donations ka hisab dikhaya jata hai.";
  }

  // 9. Feature Toggle / Admin Actions Guidance (if phrasing was close but not handled directly)
  if (isSuper && /\b(?:toggle|on kar|off kar|enable|disable|band|chalu|verify|approve)\b/i.test(lower)) {
    return "⚡ Direct Action Commands:\n\n" +
      "• Feature ON/OFF: 'SOS on kar do', 'Jobs off kar do', 'Stage 3 on kar do', 'Sabhi features on kar do'\n" +
      "• Members: 'Verify 9876543210' ya 'CONFIRM verify all'\n" +
      "• Stats: 'Live stats dikhao' ya 'Pending members kitne hain'\n\n" +
      "Aapka hukam milte hi main direct platform update kar deta hoon!";
  }

  // 10. Intelligent Conversational Fallback
  return isSuper
    ? "Aapka point samajh gaya, Super Admin! Main Matang Connect ke action controls, form builder aur architecture par nazar banaye hue hoon. Agar aap chahein toh ispar aur detail share kar sakte hain, ya koi direct command execute karwani ho toh batayein!"
    : "Aapka sandesh prapt hua! Matang Connect app me Census, SOS, Vanshawali ya Jobs se judi kisi bhi sahayata ke liye aap mujhse bejhijhak pooch sakte hain.";
}

async function callNativeGemini(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  currentMessage: string,
  isSuper: boolean
): Promise<{ reply: string; model: string } | null> {
  const geminiKey = process.env.GEMINI_API_KEY || GEMINI_DEFAULT_KEY;
  if (!geminiKey) return null;

  // Build alternating turn contents for Gemini Native API
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const m of history || []) {
    if (!m || !m.content || typeof m.content !== "string") continue;
    const text = m.content.trim();
    if (!text) continue;
    // Strip redundant static boilerplate if it was previously saved in client history
    if (text.includes("Super Admin Action Engine hoon") || text.includes("⚡ Done (Super Admin Action Engine)")) {
      continue;
    }
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
    "gemini-3.8-flash",
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
        signal: AbortSignal.timeout(15000),
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
    const rawHistory = Array.isArray(body.history) ? body.history.slice(-8) : [];
    // Ensure history doesn't duplicate the current user message at the tail
    const history = rawHistory.filter(
      (m: any, idx: number) =>
        !(idx === rawHistory.length - 1 && m?.role === "user" && m?.content?.trim() === message)
    );
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

    // Dynamic Hinglish Conversational Fallback (Context-aware, zero static loops)
    const fallbackReply = generateDynamicHinglishReply(message, isSuper, lang);
    return NextResponse.json({
      reply: fallbackReply,
      source: isSuper ? "action_engine" : "local",
      godMode: isSuper,
      executed: false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 });
  }
}
