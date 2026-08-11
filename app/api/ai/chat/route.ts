import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";

const SYSTEM = `You are Matang AI — the official in-app assistant for Matang Connect, a community app for the Matang Samaj (pilot: Bilaspur, Chhattisgarh).

Help members in simple, warm language (prefer Hindi if user writes Hindi; otherwise match their language: Hindi, English, Marathi, or Chhattisgarhi).

App modules you know:
- Census (/census): Smart family registration — members, DOB, photo, blood group, needs
- SOS (/sos): Emergency blood / medicine — hold button 3 seconds
- Notices (/notices): Community posts — staff can publish with +
- Jobs (/jobs): Livelihood opportunities
- Care (/care): Medical / elderly care requests
- Kosh/Sahyog (/kosh): Transparent community fund ledger
- Vyapar (/vyapar): Business directory
- Matrimony (/matrimony): Marriage profiles
- Dharohar (/dharohar): Heritage & culture posts
- Panchang (/panchang): Festivals calendar
- Mahila Shakti (/mahila): Women empowerment
- Arthik Vikas (/arthik): Schemes, skills, loans
- Polls (/polls): Community voting
- Profile (/profile): Digital ID, QR, edit details
- Scan (/scan): Lookup member by QR ID or phone
- History (/history): Matang Samaj story
- Admin: Verify users, Reset M-PIN, Titles, Audit, Feature flags (staff only)

Auth: Login with 10-digit phone + 4-digit M-PIN. New users register then wait for volunteer verification.
Never invent personal data about real members. Never ask for or store M-PIN. If unsure, guide them to the right screen or city volunteer.
Keep answers short (2–6 sentences) unless they ask for steps.`;

/** Offline / no-API knowledge answers */
function localAnswer(message: string, langHint: string): string {
  const q = message.toLowerCase();
  const hi = langHint === "hi" || langHint === "cg" || /[\u0900-\u097F]/.test(message);

  const pick = (en: string, h: string) => (hi ? h : en);

  if (/sos|emergency|blood|medicine|आपातकाल|एसओएस|खून|रक्त|दवा/.test(q)) {
    return pick(
      "For emergency help open SOS from the home screen or bottom bar. Choose Blood or Medicine, fill contact phone, then hold the red button for 3 seconds. You can also share to WhatsApp.",
      "आपातकाल के लिए होम या नीचे SOS खोलें। रक्त या दवा चुनें, संपर्क फोन भरें, फिर लाल बटन 3 सेकंड दबाए रखें। WhatsApp पर भी शेयर कर सकते हैं।"
    );
  }
  if (/census|family|जनगणना|परिवार|member/.test(q)) {
    return pick(
      "Go to Census from Home or bottom navigation. Add family details and each member (name, relation, DOB, education, occupation, photo). Save when done so the community can support needs.",
      "होम या नीचे से जनगणना (Census) खोलें। परिवार और हर सदस्य का विवरण (नाम, संबंध, जन्म तिथि, शिक्षा, पेशा, फोटो) भरें और सेव करें।"
    );
  }
  if (/notice|post|सूचना|पोस्ट|publish/.test(q)) {
    return pick(
      "Community posts: open Notices (bottom bar or Home → Community posts). Staff (volunteer/committee) can tap + to publish. Also see Dharohar (heritage) and Mahila Shakti.",
      "पोस्ट देखने के लिए Notices खोलें (नीचे मेनू या होम → Community posts)। स्वयंसेवक/कमिटी + दबाकर सूचना प्रकाशित कर सकते हैं। धरोहर और महिला शक्ति भी देखें।"
    );
  }
  if (/job|नौकरी|रोजगार|livelihood/.test(q)) {
    return pick(
      "Open Jobs from Home quick actions. Browse openings; staff can post new jobs with location and contact phone.",
      "होम से Jobs खोलें। नौकरियाँ देखें; स्टाफ स्थान और फोन के साथ नई नौकरी पोस्ट कर सकते हैं।"
    );
  }
  if (/register|sign up|पंजीकरण|account|login|लॉग/.test(q)) {
    return pick(
      "Register with full name, 10-digit phone, city, native village, and a 4-digit M-PIN. After register, a volunteer must verify you before login works.",
      "पंजीकरण: नाम, 10 अंक फोन, शहर, मूल गाँव और 4 अंक M-PIN। लॉगिन से पहले स्वयंसेवक सत्यापन ज़रूरी है।"
    );
  }
  if (/mpin|pin|पास|password|भूल/.test(q)) {
    return pick(
      "M-PIN is your 4-digit app PIN. If forgotten, contact a city volunteer or committee member — they can reset it from Admin → Reset M-PIN. It cannot be reset by SMS.",
      "M-PIN 4 अंकों का पिन है। भूल जाएँ तो शहर के स्वयंसेवक/कमिटी से संपर्क करें — Admin → Reset M-PIN से रीसेट होता है।"
    );
  }
  if (/qr|scan|digital id|डिजिटल/.test(q)) {
    return pick(
      "Your Digital ID and QR are on Profile and Home. Others can open Scan and enter your QR ID or phone. Public card: /u/YOUR-QR-ID.",
      "डिजिटल आईडी और QR प्रोफाइल व होम पर हैं। Scan से QR ID या फोन डालकर सदस्य खोजें।"
    );
  }
  if (/matrimony|विवाह|शादी|marriage/.test(q)) {
    return pick(
      "Open Matrimony from Home. Create your profile (gender, age, education, about). You can hide contact until you choose to show it.",
      "होम से Matrimony खोलें। प्रोफाइल बनाएँ (लिंग, उम्र, शिक्षा)। संपर्क छुपा सकते हैं।"
    );
  }
  if (/vyapar|business|दुकान|व्यापार/.test(q)) {
    return pick(
      "Vyapar is the business directory. List your shop/service with phone and WhatsApp so community members can find you.",
      "Vyapar व्यापार निर्देशिका है। दुकान/सेवा फोन और WhatsApp के साथ जोड़ें।"
    );
  }
  if (/kosh|sahyog|fund|कोष|सहयोग/.test(q)) {
    return pick(
      "Sahyog / Kosh shows transparent income and expense entries for the city fund. Staff can add ledger entries.",
      "सहयोग / कोष में शहर कोष की आय-व्यय प्रविष्टियाँ दिखती हैं। स्टाफ प्रविष्टि जोड़ सकते हैं।"
    );
  }
  if (/language|भाषा|hindi|मराठी|छत्तीस/.test(q)) {
    return pick(
      "Tap the language button (EN/हि/मर/छग) in the top header to switch English, Hindi, Marathi, or Chhattisgarhi.",
      "ऊपर हेडर में भाषा बटन (EN/हि/मर/छग) से भाषा बदलें।"
    );
  }
  if (/admin|verify|सत्याप|volunteer/.test(q)) {
    return pick(
      "Volunteers and committee: Home → Admin Tools → Verify Users, Reset M-PIN, City Titles, Audit. Super Admin also has Feature Flags.",
      "स्वयंसेवक/कमिटी: होम → Admin Tools → Verify, Reset M-PIN, Titles, Audit।"
    );
  }
  if (/hello|hi|namaste|नमस्ते|help|मदद|क्या कर/.test(q)) {
    return pick(
      "Namaste! I'm Matang AI. Ask me about Census, SOS, Notices, Jobs, Profile, QR, or any module. How can I help?",
      "नमस्ते! मैं मातंग AI हूँ। जनगणना, SOS, सूचना, नौकरी, प्रोफाइल या किसी भी मॉड्यूल के बारे में पूछें।"
    );
  }

  return pick(
    "I can guide you on Census, SOS, Notices/posts, Jobs, Care, Kosh, Vyapar, Matrimony, Profile QR, and admin tools. Ask a specific question, or open Home for all modules.",
    "मैं जनगणना, SOS, सूचना/पोस्ट, नौकरी, देखभाल, कोष, व्यापार, विवाह, प्रोफाइल QR और एडमिन टूल में मदद कर सकता हूँ। स्पष्ट प्रश्न पूछें, या होम पर सभी मॉड्यूल देखें।"
  );
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required to use Matang AI" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const message = String(body.message || "").trim().slice(0, 2000);
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const lang = String(body.lang || "en").slice(0, 5);

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

    if (apiKey) {
      try {
        const messages = [
          { role: "system", content: SYSTEM },
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
            temperature: 0.5,
            max_tokens: 500,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const reply =
            data?.choices?.[0]?.message?.content?.trim() ||
            localAnswer(message, lang);
          return NextResponse.json({ reply, source: "grok" });
        }
        console.error("xAI chat error", await res.text());
      } catch (e) {
        console.error("xAI fetch failed", e);
      }
    }

    // Built-in knowledge assistant (works without API key)
    return NextResponse.json({
      reply: localAnswer(message, lang),
      source: "local",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 });
  }
}
