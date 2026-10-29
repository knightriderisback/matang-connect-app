/**
 * Super AI Local Action Engine Client
 * Connects Matang Connect directly to the local SUPER-AI autonomous multi-agent kernel
 * running at http://127.0.0.1:8787.
 *
 * STRICT SECURITY: Only callable when session.role === "super_admin".
 */

export interface SuperAiResponse {
  ok: boolean;
  reply?: string;
  source: "super_ai_action" | "super_ai_orchestrator" | "error";
  error?: string;
  telemetry?: any;
}

const SUPER_AI_ENDPOINT = process.env.SUPER_AI_URL || "http://127.0.0.1:8787";

export async function isSuperAiOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPER_AI_ENDPOINT}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(500),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function querySuperAiAction(
  message: string,
  actorId: string,
  lang: string = "hi"
): Promise<SuperAiResponse> {
  const isOrchestrate = /orchestrate|workflow|plan|task\s*plan|feature\s*banao|ui\s*(?:badlo|change)|autonomous/i.test(
    message
  );

  const endpoint = isOrchestrate
    ? `${SUPER_AI_ENDPOINT}/api/orchestrate`
    : `${SUPER_AI_ENDPOINT}/api/chat`;

  const isAsi = /^\/asi\b|asi\s*mode|deep\s*reasoning|superintelligence/i.test(message);

  const payload = isOrchestrate
    ? { goal: message }
    : {
        session_id: `god_admin_${actorId.slice(0, 12)}`,
        message: message,
        language: lang,
        temperature: 0.2,
        asi_mode: isAsi,
      };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000), // Local model inference / agent execution
    });

    if (!res.ok) {
      return {
        ok: false,
        source: "error",
        error: `SUPER-AI HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    let reply = "";

    if (isOrchestrate) {
      const plan = Array.isArray(data.plan)
        ? data.plan.map((p: any, i: number) => `${i + 1}. ${p.step || p}`).join("\n")
        : "";
      reply = `⚡ SUPER-AI Orchestrator Executed Goal:\n\n${data.result || data.answer || "Plan generated."}\n\n${plan ? "📋 Steps Executed:\n" + plan : ""}`;
    } else {
      reply = data.answer || data.reply || (typeof data === "string" ? data : JSON.stringify(data));
    }

    return {
      ok: true,
      reply: reply.trim(),
      source: isOrchestrate ? "super_ai_orchestrator" : "super_ai_action",
      telemetry: data.telemetry,
    };
  } catch (err: any) {
    return {
      ok: false,
      source: "error",
      error: err?.message || "SUPER-AI connection timed out",
    };
  }
}
