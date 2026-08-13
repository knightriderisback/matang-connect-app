import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { writeAuditLog } from "@/lib/audit";
import {
  tryGodAction,
  fetchPublicInfo,
  wantsWebInfo,
} from "@/lib/godActions";

const SYSTEM_MEMBER = `You are Matang AI — community help assistant for Matang Connect.
Help members in simple language. Guide Census, SOS, Jobs, Care, Feed, Kosh, Profile, Scan.
Never ask for M-PIN digits. Never invent personal member data. Do not discuss Super Admin tools.
Keep answers short.`;

const SYSTEM_GOD = `You are Matang AI · GOD MODE for Super Admin of Matang Connect.
You can explain results of actions already executed by the system.
When the user asked to change something, the system may have already applied it — confirm based on the action result provided.
Never expose secrets, M-PIN hashes, or API keys.
Be concise and operational.`;

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

    const isSuper = session.role === "super_admin";

    // ========== GOD MODE: execute real actions ==========
    if (isSuper) {
      const action = await tryGodAction(message, session.userId);
      if (action.handled) {
        await writeAuditLog({
          actorId: session.userId,
          action: "ai_god_action",
          meta: { message: message.slice(0, 200) },
        });
        return NextResponse.json({
          reply: `✅ Done (God Mode)\n\n${action.message}`,
          source: "god_action",
          godMode: true,
          executed: true,
        });
      }

      // Web / public information
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

    const systemPrompt = isSuper ? SYSTEM_GOD : SYSTEM_MEMBER;
    const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

    if (apiKey) {
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
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-2-latest",
            messages,
            temperature: 0.4,
            max_tokens: isSuper ? 700 : 450,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const reply =
            data?.choices?.[0]?.message?.content?.trim() ||
            localMember(message, lang);
          await writeAuditLog({
            actorId: session.userId,
            action: isSuper ? "ai_god_mode" : "ai_member",
            meta: { source: "grok" },
          });
          return NextResponse.json({
            reply,
            source: "grok",
            godMode: isSuper,
            executed: false,
          });
        }
      } catch (e) {
        console.error("xAI failed", e);
      }
    }

    // Super admin: try web once more as fallback for any question
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
    }

    return NextResponse.json({
      reply: isSuper
        ? `God Mode ready. Try commands like:\n• "Enable stage 3"\n• "Disable SOS"\n• "Verify all pending"\n• "Verify phone 9876543210"\n• "Reset M-PIN 9876543210 to 1234"\n• "Post notice: Meeting Sunday 10am"\n• "How many users"\n• "List pending"\n• "What is Chhattisgarh" (web info)`
        : localMember(message, lang),
      source: "local",
      godMode: isSuper,
      executed: false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 });
  }
}
