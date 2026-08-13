import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { writeAuditLog } from "@/lib/audit";

const SYSTEM_MEMBER = `You are Matang AI — the community help assistant for Matang Connect (Bilaspur pilot, Chhattisgarh).
Help members in simple, warm language (prefer Hindi if user writes Hindi; otherwise match Hindi, English, Marathi, or Chhattisgarhi).

You guide ONLY on member features:
- Census (/census): family registration, members, DOB, photo, blood group, needs
- SOS (/sos): emergency / blood alert, WhatsApp share
- Jobs (/jobs): view and post jobs
- Care (/care): medical, elderly, disability, financial, educational support requests
- Community Feed / Notices (Home): announcements, Shok Sandesh, meetings
- Sahyog Kosh (/kosh): transparent community fund
- Profile (/profile): Digital ID, QR, edit details, change M-PIN
- Scan (/scan): lookup by QR
- History (/history): Matang culture / history
- Vyapar, Matrimony, Dharohar, Panchang, Mahila, Polls, Rides, Gaurav, Credits when Stage 3 is on

Rules:
- Never invent personal data about real members.
- Never ask for or store M-PIN digits. For forgot M-PIN: contact city Volunteer / Core Committee / Super Admin (Admin → Reset M-PIN).
- Do not explain Super Admin Stage Lock, Feature Flags, Audit, or internal DB/SQL.
- If unsure, point to the right screen or city volunteer.
Keep answers short (3–6 sentences).`;

const SYSTEM_GOD = `You are Matang AI · GOD MODE — Super Admin copilot for Matang Connect.
The user is SUPER ADMIN. Speak clearly (Hindi or English as they write).

You help operate the full platform:
MEMBER areas: Census, SOS, Jobs, Care, Feed/Notices, Kosh, Profile, Scan, History, Stage-3 modules.
ADMIN areas (priority):
- Admin hub (/admin): all module shortcuts
- Stage Lock / Feature Flags (/admin/settings): turn stages and modules ON/OFF for members (Super Admin always sees everything)
- Verify Users (/admin/verify): approve pending registrations
- Directory (/admin/directory): member CRM, open profile, personal feature ON/OFF per member
- Reset M-PIN (/admin/reset-mpin): set 4-digit PIN after in-person verification
- City Titles (/admin/titles): assign titles via titles + city_titles
- Audit Log (/admin/audit): who did what; use “Write test entry” if empty
- Demo data: Admin → Load demo data (50 members, posts, jobs, care, kosh)

God Mode rules:
- Never expose M-PIN hashes, service role keys, JWT secrets, or raw env values.
- Do not invent live database counts or claim you executed SQL.
- Suggest safe operational steps only (which screen, which toggle).
- For schema issues, suggest checking Supabase table columns — never paste secrets.
Keep answers practical and step-by-step.`;

function localMember(q0: string, lang: string): string {
  const q = q0.toLowerCase();
  const hi = lang === "hi" || lang === "cg" || /[\u0900-\u097F]/.test(q0);
  if (/sos|emergency|blood|आपातकाल|खून/.test(q)) {
    return hi
      ? "SOS के लिए नीचे मेनू में SOS खोलें → प्रकार चुनें → भेजें। WhatsApp से शेयर भी कर सकते हैं।"
      : "Open SOS from the bottom menu → choose type → send. You can also share on WhatsApp.";
  }
  if (/census|family|जनगणना|परिवार/.test(q)) {
    return hi
      ? "जनगणना Home या नीचे Census से खोलें। परिवार और सदस्यों की जानकारी भरकर Save करें।"
      : "Open Census from Home or bottom nav. Add family and members, then Save.";
  }
  if (/job|rojgar|नौकरी/.test(q)) {
    return hi
      ? "Jobs मॉड्यूल में खुली नौकरियाँ देखें या नई पोस्ट करें।"
      : "Open Jobs to browse openings or post a new job.";
  }
  if (/care|बुजुर्ग|medical|सहायता/.test(q)) {
    return hi
      ? "Care में medical / elderly / disability / financial / educational मदद माँग सकते हैं।"
      : "In Care, request medical, elderly, disability, financial or educational help.";
  }
  if (/notice|feed|सूचना|शोक/.test(q)) {
    return hi
      ? "Home पर Community Feed है — सूचनाएँ और शोक संदेश वहीं दिखते हैं।"
      : "Community Feed on Home shows notices and Shok Sandesh.";
  }
  if (/mpin|m-pin|पिन|password|भूल/.test(q)) {
    return hi
      ? "M-PIN भूल गए तो शहर के Volunteer / Committee से मिलें — वे Admin → Reset M-PIN से नया 4 अंक सेट करेंगे। SMS से रिसेट नहीं होता।"
      : "Forgot M-PIN? Meet a city volunteer/committee — they reset it under Admin → Reset M-PIN. No SMS reset.";
  }
  if (/profile|प्रोफाइल|qr|digital/.test(q)) {
    return hi
      ? "Profile में Digital ID, QR और Edit से नाम/गाँव आदि अपडेट करें।"
      : "Profile has Digital ID, QR, and Edit for name/village and more.";
  }
  if (/kosh|sahyog|कोष/.test(q)) {
    return hi
      ? "Sahyog / Kosh में समुदाय की फंड एंट्री और योगदान देखे जा सकते हैं।"
      : "Sahyog / Kosh shows community fund entries and contributions.";
  }
  return hi
    ? "मैं Matang AI हूँ — Census, SOS, Jobs, Care, Feed, Profile में मदद करता हूँ। अपना सवाल छोटा लिखें या नीचे सुझाव चुनें।"
    : "I'm Matang AI — I help with Census, SOS, Jobs, Care, Feed, Profile. Ask a short question or pick a suggestion.";
}

function localGod(q0: string, lang: string): string {
  const q = q0.toLowerCase();
  const hi = lang === "hi" || lang === "cg" || /[\u0900-\u097F]/.test(q0);
  if (/stage|lock|flag|feature|मॉड्यूल|ऑन|ऑफ/.test(q)) {
    return hi
      ? "Admin → Stage Lock / Feature Flags खोलें। Stage 1/2/3 और हर मॉड्यूल ON/OFF करें। यह सिर्फ members पर लगता है — Super Admin को सब दिखता रहता है।"
      : "Open Admin → Stage Lock / Feature Flags. Toggle Stage 1/2/3 and each module. Affects members only — Super Admin always has full access.";
  }
  if (/verify|pending|सत्यापन/.test(q)) {
    return hi
      ? "Admin → Verify Users में pending सदस्यों को approve करें।"
      : "Admin → Verify Users — approve pending members.";
  }
  if (/audit|लॉग/.test(q)) {
    return hi
      ? "Admin → Audit Log में login/register/profile/flags दिखते हैं। खाली हो तो “Write test entry” दबाएँ।"
      : "Admin → Audit Log lists login/register/profile/flags. If empty, tap “Write test entry”.";
  }
  if (/directory|crm|सदस्य|profile/.test(q)) {
    return hi
      ? "Admin → Directory में सदस्य खोलें — पूरी प्रोफ़ाइल + Personal feature ON/OFF।"
      : "Admin → Directory → open a member for full profile + personal feature ON/OFF.";
  }
  if (/mpin|reset|पिन/.test(q)) {
    return hi
      ? "Admin → Reset M-PIN → सदस्य चुनें → नया 4 अंक → Confirm। पहचान पहले खुद verify करें।"
      : "Admin → Reset M-PIN → pick member → new 4 digits → Confirm. Verify identity first.";
  }
  if (/demo|seed|डमी|50/.test(q)) {
    return hi
      ? "Admin हब में “Load demo data” — 50 सदस्य (90000xxxxx / M-PIN 1234), posts, jobs, care, kosh।"
      : "Admin hub → “Load demo data” — 50 members (90000xxxxx / PIN 1234), posts, jobs, care, kosh.";
  }
  if (/title|पद/.test(q)) {
    return hi
      ? "Admin → City Titles से शहर-वार पद असाइन करें (titles + city_titles)।"
      : "Admin → City Titles assigns city-wise titles (titles + city_titles).";
  }
  if (/sos|census|job|care|feed/.test(q)) {
    return localMember(q0, lang) + (hi ? "\n\n(God Mode: Admin टूल्स भी पूछ सकते हैं।)" : "\n\n(God Mode: you can also ask about Admin tools.)");
  }
  return hi
    ? "God Mode: Stage Lock, Verify, Directory, Reset M-PIN, Titles, Audit, Demo data — क्या करना है लिखें, स्टेप बताऊँगा।"
    : "God Mode: ask about Stage Lock, Verify, Directory, Reset M-PIN, Titles, Audit, or Demo data — I'll give steps.";
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
    const systemPrompt = isSuper ? SYSTEM_GOD : SYSTEM_MEMBER;

    const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (apiKey) {
      try {
        const messages = [
          { role: "system", content: systemPrompt },
          ...history
            .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && m.content)
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
            temperature: isSuper ? 0.4 : 0.5,
            max_tokens: isSuper ? 700 : 450,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const reply =
            data?.choices?.[0]?.message?.content?.trim() ||
            (isSuper ? localGod(message, lang) : localMember(message, lang));
          await writeAuditLog({
            actorId: session.userId,
            action: isSuper ? "ai_god_mode" : "ai_member",
            meta: { source: "grok" },
          });
          return NextResponse.json({ reply, source: "grok", godMode: isSuper });
        }
        console.error("xAI chat error", await res.text());
      } catch (e) {
        console.error("xAI fetch failed", e);
      }
    }

    const reply = isSuper ? localGod(message, lang) : localMember(message, lang);
    await writeAuditLog({
      actorId: session.userId,
      action: isSuper ? "ai_god_mode" : "ai_member",
      meta: { source: "local" },
    });
    return NextResponse.json({ reply, source: "local", godMode: isSuper });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 });
  }
}
