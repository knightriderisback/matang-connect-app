import { Answers, LabelMap } from "@/lib/parivar/form";

export interface SchemeSuggestion {
  code: string;
  title: LabelMap;
  why: LabelMap;
}

const LOW_INCOME = ["<10k", "10-25k"];
const docStatus = (v: any): string => (v && typeof v === "object" ? String(v.status || "") : "");
const num = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Simple rule-based Yojana matcher. Ye sirf "ho sakta hai aap eligible ho" ka suggestion hai;
 * asli eligibility sarkari rules par depend karti hai (volunteer se confirm karein).
 * Field keys form config ke seeded keys hain; hidden/missing field par rule apne aap skip ho jaata hai.
 */
export function suggestSchemes(fam: Answers, members: Answers[]): SchemeSuggestion[] {
  const out: SchemeSuggestion[] = [];
  const income = String(fam.family_income_range || "");
  const rationType = String(fam.ration_card_type || "");
  const lowIncome = LOW_INCOME.includes(income) || rationType === "bpl" || rationType === "antyodaya";
  const ages = members.map((m) => num(m.age));

  if (lowIncome && docStatus(fam.ayushman_card) !== "yes" && fam.ayushman_card !== undefined) {
    out.push({
      code: "ayushman",
      title: { en: "Ayushman Bharat (PM-JAY) health card", hi: "आयुष्मान भारत (PM-JAY) हेल्थ कार्ड" },
      why: { en: "Family income is low and there is no Ayushman card yet.", hi: "परिवार की आय कम है और आयुष्मान कार्ड अभी नहीं है।" },
    });
  }

  if (docStatus(fam.ration_card) === "no" && LOW_INCOME.includes(income)) {
    out.push({
      code: "ration",
      title: { en: "Ration card (food security)", hi: "राशन कार्ड (खाद्य सुरक्षा)" },
      why: { en: "Low-income family without a ration card.", hi: "कम आय वाले परिवार के पास राशन कार्ड नहीं है।" },
    });
  }

  if (members.some((m, i) => {
    const a = ages[i];
    return a !== null && a >= 16 && a <= 59 && ["Labour", "Farming"].includes(String(m.occupation || "")) && docStatus(m.e_shram_card) !== "yes";
  }) && docStatus(fam.e_shram_card) !== "yes" && fam.e_shram_card !== undefined) {
    out.push({
      code: "eshram",
      title: { en: "e-Shram card (unorganised workers)", hi: "ई-श्रम कार्ड (असंगठित श्रमिक)" },
      why: { en: "A working-age member does labour/farming work.", hi: "परिवार में कोई सदस्य मज़दूरी/खेती का काम करता है।" },
    });
  }

  if (lowIncome && ages.some((a) => a !== null && a >= 60)) {
    out.push({
      code: "pension",
      title: { en: "Old-age pension", hi: "वृद्धावस्था पेंशन" },
      why: { en: "Senior citizen in a low-income family.", hi: "कम आय वाले परिवार में वरिष्ठ नागरिक हैं।" },
    });
  }

  if (members.some((m) => String(m.marital_status || "") === "widowed" && String(m.gender || "") === "female")) {
    out.push({
      code: "widow",
      title: { en: "Widow pension / support schemes", hi: "विधवा पेंशन / सहायता योजनाएँ" },
      why: { en: "A widowed woman is part of the family.", hi: "परिवार में विधवा महिला सदस्य हैं।" },
    });
  }

  if (LOW_INCOME.includes(income) && members.some((m, i) => {
    const a = ages[i];
    return (String(m.occupation || "") === "Student" || String(m.currently_studying || "") === "yes") && (a === null || a <= 30);
  })) {
    out.push({
      code: "scholarship",
      title: { en: "Scholarship for students", hi: "विद्यार्थियों के लिए छात्रवृत्ति" },
      why: { en: "A student in a low-income family.", hi: "कम आय वाले परिवार में विद्यार्थी हैं।" },
    });
  }

  if (members.some((m) => String(m.disability_status || "none") !== "none" && m.disability_status !== undefined)) {
    out.push({
      code: "disability",
      title: { en: "Disability certificate (UDID) and benefits", hi: "दिव्यांग प्रमाणपत्र (UDID) और लाभ" },
      why: { en: "A member has a disability.", hi: "परिवार में दिव्यांग सदस्य हैं।" },
    });
  }

  if (members.some((m) => String(m.bank_account || "") === "no")) {
    out.push({
      code: "jandhan",
      title: { en: "Bank account (Jan Dhan)", hi: "बैंक खाता (जन धन)" },
      why: { en: "A member has no bank account.", hi: "किसी सदस्य का बैंक खाता नहीं है।" },
    });
  }

  if (String(fam.employment_status || "") === "farming") {
    out.push({
      code: "kisan",
      title: { en: "PM-KISAN (if you own farmland)", hi: "पीएम-किसान (यदि खेती की ज़मीन है)" },
      why: { en: "Farming is the main source of income.", hi: "आय का मुख्य स्रोत खेती है।" },
    });
  }

  return out;
}
