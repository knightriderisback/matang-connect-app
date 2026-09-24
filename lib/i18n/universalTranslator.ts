/**
 * Universal Omnilingual Translator & Transliteration Engine for Matang Connect
 * Handles DNA-level deep translation of dynamic text, names, posts, locations, and DOM nodes.
 */

export type TargetLanguage = "en" | "hi" | "mr" | "cg" | "hng";

// Standard Common Name / Location / Community Dictionary
const VOCABULARY_MAP: Record<string, { hi: string; mr: string; cg: string; hng: string; en: string }> = {
  // Cities & Regions
  "raipur": { hi: "रायपुर", mr: "रायपूर", cg: "रायपुर", hng: "Raipur", en: "Raipur" },
  "bilaspur": { hi: "बिलासपुर", mr: "बिलासपूर", cg: "बिलासपुर", hng: "Bilaspur", en: "Bilaspur" },
  "durg": { hi: "दुर्ग", mr: "दुर्ग", cg: "दुर्ग", hng: "Durg", en: "Durg" },
  "bhilai": { hi: "भिलाई", mr: "भिलाई", cg: "भिलाई", hng: "Bhilai", en: "Bhilai" },
  "korba": { hi: "कोरबा", mr: "कोरबा", cg: "कोरबा", hng: "Korba", en: "Korba" },
  "rajnandgaon": { hi: "राजनंदगांव", mr: "राजनंदगाव", cg: "राजनंदगांव", hng: "Rajnandgaon", en: "Rajnandgaon" },
  "jagdalpur": { hi: "जगदलपुर", mr: "जगदलपूर", cg: "जगदलपुर", hng: "Jagdalpur", en: "Jagdalpur" },
  "raigarh": { hi: "रायगढ़", mr: "रायगड", cg: "रायगढ़", hng: "Raigarh", en: "Raigarh" },
  "chhattisgarh": { hi: "छत्तीसगढ़", mr: "छत्तीसगड", cg: "छत्तीसगढ़", hng: "Chhattisgarh", en: "Chhattisgarh" },
  "maharashtra": { hi: "महाराष्ट्र", mr: "महाराष्ट्र", cg: "महाराष्ट्र", hng: "Maharashtra", en: "Maharashtra" },
  "mumbai": { hi: "मुंबई", mr: "मुंबई", cg: "मुंबई", hng: "Mumbai", en: "Mumbai" },
  "pune": { hi: "पुणे", mr: "पुणे", cg: "पुणे", hng: "Pune", en: "Pune" },
  "nagpur": { hi: "नागपुर", mr: "नागपूर", cg: "नागपुर", hng: "Nagpur", en: "Nagpur" },
  "thane": { hi: "ठाणे", mr: "ठाणे", cg: "ठाणे", hng: "Thane", en: "Thane" },
  "solapur": { hi: "सोलापुर", mr: "सोलापूर", cg: "सोलापुर", hng: "Solapur", en: "Solapur" },
  "kolhapur": { hi: "कोल्हापुर", mr: "कोल्हापूर", cg: "कोल्हापुर", hng: "Kolhapur", en: "Kolhapur" },
  "nashik": { hi: "नासिक", mr: "नाशिक", cg: "नासिक", hng: "Nashik", en: "Nashik" },
  "aurangabad": { hi: "औरंगाबाद", mr: "औरंगाबाद", cg: "औरंगाबाद", hng: "Aurangabad", en: "Aurangabad" },
  "amravati": { hi: "अमरावती", mr: "अमरावती", cg: "अमरावती", hng: "Amravati", en: "Amravati" },
  "nanded": { hi: "नांदेड़", mr: "नांदेड", cg: "नांदेड़", hng: "Nanded", en: "Nanded" },
  "delhi": { hi: "दिल्ली", mr: "दिल्ली", cg: "दिल्ली", hng: "Delhi", en: "Delhi" },
  "india": { hi: "भारत", mr: "भारत", cg: "भारत", hng: "Bharat", en: "India" },

  // Community & Common Surnames
  "matang": { hi: "मातंग", mr: "मातंग", cg: "मातंग", hng: "Matang", en: "Matang" },
  "sharma": { hi: "शर्मा", mr: "शर्मा", cg: "शर्मा", hng: "Sharma", en: "Sharma" },
  "verma": { hi: "वर्मा", mr: "वर्मा", cg: "वर्मा", hng: "Verma", en: "Verma" },
  "patil": { hi: "पाटिल", mr: "पाटील", cg: "पाटिल", hng: "Patil", en: "Patil" },
  "kamble": { hi: "कांबले", mr: "कांबळे", cg: "कांबले", hng: "Kamble", en: "Kamble" },
  "gaikwad": { hi: "गायकवाड़", mr: "गायकवाड", cg: "गायकवाड़", hng: "Gaikwad", en: "Gaikwad" },
  "shinde": { hi: "शिंदे", mr: "शिंदे", cg: "शिंदे", hng: "Shinde", en: "Shinde" },
  "jadhav": { hi: "जाधव", mr: "जाधव", cg: "जाधव", hng: "Jadhav", en: "Jadhav" },
  "more": { hi: "मोरे", mr: "मोरे", cg: "मोरे", hng: "More", en: "More" },
  "pawar": { hi: "पवार", mr: "पवार", cg: "पवार", hng: "Pawar", en: "Pawar" },
  "kadam": { hi: "कदम", mr: "कदम", cg: "कदम", hng: "Kadam", en: "Kadam" },
  "chouhan": { hi: "चौहान", mr: "चव्हाण", cg: "चौहान", hng: "Chouhan", en: "Chouhan" },
  "baghel": { hi: "बघेल", mr: "बघेल", cg: "बघेल", hng: "Baghel", en: "Baghel" },
  "sahu": { hi: "साहू", mr: "साहू", cg: "साहू", hng: "Sahu", en: "Sahu" },
  "yadav": { hi: "यादव", mr: "यादव", cg: "यादव", hng: "Yadav", en: "Yadav" },
  "gupta": { hi: "गुप्ता", mr: "गुप्ता", cg: "गुप्ता", hng: "Gupta", en: "Gupta" },
  "singh": { hi: "सिंह", mr: "सिंह", cg: "सिंह", hng: "Singh", en: "Singh" },
  "kumar": { hi: "कुमार", mr: "कुमार", cg: "कुमार", hng: "Kumar", en: "Kumar" },
  "prasad": { hi: "प्रसाद", mr: "प्रसाद", cg: "प्रसाद", hng: "Prasad", en: "Prasad" },
  "soni": { hi: "सोनी", mr: "सोनी", cg: "सोनी", hng: "Soni", en: "Soni" },
  "dewangan": { hi: "देवांगन", mr: "देवांगन", cg: "देवांगन", hng: "Dewangan", en: "Dewangan" },

  // Common First Names
  "rahul": { hi: "राहुल", mr: "राहुल", cg: "राहुल", hng: "Rahul", en: "Rahul" },
  "amit": { hi: "अमित", mr: "अमित", cg: "अमित", hng: "Amit", en: "Amit" },
  "suresh": { hi: "सुरेश", mr: "सुरेश", cg: "सुरेश", hng: "Suresh", en: "Suresh" },
  "ramesh": { hi: "रमेश", mr: "रमेश", cg: "रमेश", hng: "Ramesh", en: "Ramesh" },
  "mahesh": { hi: "महेश", mr: "महेश", cg: "महेश", hng: "Mahesh", en: "Mahesh" },
  "ganesh": { hi: "गणेश", mr: "गणेश", cg: "गणेश", hng: "Ganesh", en: "Ganesh" },
  "pooja": { hi: "पूजा", mr: "पूजा", cg: "पूजा", hng: "Pooja", en: "Pooja" },
  "priya": { hi: "प्रिया", mr: "प्रिया", cg: "प्रिया", hng: "Priya", en: "Priya" },
  "sneha": { hi: "स्नेहा", mr: "स्नेहा", cg: "स्नेहा", hng: "Sneha", en: "Sneha" },
  "anita": { hi: "अनीता", mr: "अनिता", cg: "अनीता", hng: "Anita", en: "Anita" },
  "sunita": { hi: "सुनीता", mr: "सुनिता", cg: "सुनीता", hng: "Sunita", en: "Sunita" },
  "mukesh": { hi: "मुकेश", mr: "मुकेश", cg: "मुकेश", hng: "Mukesh", en: "Mukesh" },
  "rajesh": { hi: "राजेश", mr: "राजेश", cg: "राजेश", hng: "Rajesh", en: "Rajesh" },
  "vikas": { hi: "विकास", mr: "विकास", cg: "विकास", hng: "Vikas", en: "Vikas" },
  "rohit": { hi: "रोहित", mr: "रोहित", cg: "रोहित", hng: "Rohit", en: "Rohit" },
  "deepak": { hi: "दीपक", mr: "दीपक", cg: "दीपक", hng: "Deepak", en: "Deepak" },
  "sanjay": { hi: "संजय", mr: "संजय", cg: "संजय", hng: "Sanjay", en: "Sanjay" },
  "ajay": { hi: "अजय", mr: "अजय", cg: "अजय", hng: "Ajay", en: "Ajay" },
  "vijay": { hi: "विजय", mr: "विजय", cg: "विजय", hng: "Vijay", en: "Vijay" },
  "anil": { hi: "अनिल", mr: "अनिल", cg: "अनिल", hng: "Anil", en: "Anil" },
  "sunil": { hi: "सुनील", mr: "सुनील", cg: "सुनील", hng: "Sunil", en: "Sunil" },
  "ashok": { hi: "अशोक", mr: "अशोक", cg: "अशोक", hng: "Ashok", en: "Ashok" },
  "santosh": { hi: "संतोष", mr: "संतोष", cg: "संतोष", hng: "Santosh", en: "Santosh" },
  "satish": { hi: "सतीश", mr: "सतीश", cg: "सतीश", hng: "Satish", en: "Satish" },
  "dinesh": { hi: "दिनेश", mr: "दिनेश", cg: "दिनेश", hng: "Dinesh", en: "Dinesh" },
  "manoj": { hi: "मनोज", mr: "मनोज", cg: "मनोज", hng: "Manoj", en: "Manoj" },
  "rakesh": { hi: "राकेश", mr: "राकेश", cg: "राकेश", hng: "Rakesh", en: "Rakesh" },
  "pankaj": { hi: "पंकज", mr: "पंकज", cg: "पंकज", hng: "Pankaj", en: "Pankaj" },
  "vinod": { hi: "विनोद", mr: "विनोद", cg: "विनोद", hng: "Vinod", en: "Vinod" },
  "pradeep": { hi: "प्रदीप", mr: "प्रदीप", cg: "प्रदीप", hng: "Pradeep", en: "Pradeep" },
  "praveen": { hi: "प्रवीण", mr: "प्रवीण", cg: "प्रवीण", hng: "Praveen", en: "Praveen" },
  "sandip": { hi: "संदीप", mr: "संदीप", cg: "संदीप", hng: "Sandip", en: "Sandip" },
  "sandeep": { hi: "संदीप", mr: "संदीप", cg: "संदीप", hng: "Sandeep", en: "Sandeep" },
  "neha": { hi: "नेहा", mr: "नेहा", cg: "नेहा", hng: "Neha", en: "Neha" },
  "kavita": { hi: "कविता", mr: "कविता", cg: "कविता", hng: "Kavita", en: "Kavita" },
  "rekha": { hi: "रेखा", mr: "रेखा", cg: "रेखा", hng: "Rekha", en: "Rekha" },
  "seema": { hi: "सीमा", mr: "सीमा", cg: "सीमा", hng: "Seema", en: "Seema" },
  "geeta": { hi: "गीता", mr: "गीता", cg: "गीता", hng: "Geeta", en: "Geeta" },
  "radha": { hi: "राधा", mr: "राधा", cg: "राधा", hng: "Radha", en: "Radha" },
  "laxmi": { hi: "लक्ष्मी", mr: "लक्ष्मी", cg: "लक्ष्मी", hng: "Laxmi", en: "Laxmi" },
  "durga": { hi: "दुर्गा", mr: "दुर्गा", cg: "दुर्गा", hng: "Durga", en: "Durga" },

  // Feed & Action Words
  "meeting": { hi: "बैठक", mr: "बैठक", cg: "बैठक", hng: "Meeting", en: "Meeting" },
  "notice": { hi: "सूचना", mr: "सूचना", cg: "सूचना", hng: "Notice", en: "Notice" },
  "urgent": { hi: "अति आवश्यक", mr: "तातडीचे", cg: "जरूरी", hng: "Urgent", en: "Urgent" },
  "announcement": { hi: "घोषणा", mr: "घोषणा", cg: "घोषणा", hng: "Announcement", en: "Announcement" },
  "event": { hi: "कार्यक्रम", mr: "कार्यक्रम", cg: "कार्यक्रम", hng: "Event", en: "Event" },
  "samaj": { hi: "समाज", mr: "समाज", cg: "समाज", hng: "Samaj", en: "Samaj" },
  "community": { hi: "समाज", mr: "समाज", cg: "समाज", hng: "Community", en: "Community" },
  "welcome": { hi: "स्वागत है", mr: "स्वागत आहे", cg: "स्वागत हे", hng: "Swagat hai", en: "Welcome" },
  "congratulations": { hi: "बधाई हो", mr: "अभिनंदन", cg: "बधाई हो", hng: "Badhai ho", en: "Congratulations" },
  "today": { hi: "आज", mr: "आज", cg: "आज", hng: "Aaj", en: "Today" },
  "tomorrow": { hi: "कल", mr: "उद्या", cg: "कालि", hng: "Kal", en: "Tomorrow" },
  "yesterday": { hi: "कल", mr: "काल", cg: "कालि", hng: "Kal", en: "Yesterday" },
  "blood": { hi: "रक्तदान", mr: "रक्तदान", cg: "खून दान", hng: "Blood", en: "Blood" },
  "donation": { hi: "सहयोग / दान", mr: "दान", cg: "दान", hng: "Donation", en: "Donation" },
  "help": { hi: "मदद", mr: "मदत", cg: "मदद", hng: "Madad", en: "Help" },
  "job": { hi: "रोजगार", mr: "नोकरी", cg: "रोजगार", hng: "Job", en: "Job" },
  "business": { hi: "व्यापार", mr: "उद्योग", cg: "व्यापार", hng: "Business", en: "Business" },
  "wedding": { hi: "विवाह", mr: "विवाह", cg: "बिहाव", hng: "Vivah", en: "Wedding" },
  "matrimony": { hi: "वैवाहिक", mr: "वैवाहिक", cg: "वैवाहिक", hng: "Matrimony", en: "Matrimony" },
  "verified": { hi: "सत्यापित", mr: "पडताळणीकृत", cg: "सत्यापित", hng: "Verified", en: "Verified" },
  "pending": { hi: "लंबित", mr: "प्रलंबित", cg: "रुके हे", hng: "Pending", en: "Pending" },
  "active": { hi: "सक्रिय", mr: "सक्रिय", cg: "सक्रिय", hng: "Active", en: "Active" },
  "inactive": { hi: "निष्क्रिय", mr: "निष्क्रिय", cg: "निष्क्रिय", hng: "Inactive", en: "Inactive" },
  "member": { hi: "सदस्य", mr: "सदस्य", cg: "सदस्य", hng: "Member", en: "Member" },
  "volunteer": { hi: "स्वयंसेवक", mr: "स्वयंसेवक", cg: "स्वयंसेवक", hng: "Volunteer", en: "Volunteer" },
  "admin": { hi: "प्रशासक", mr: "प्रशासक", cg: "प्रशासक", hng: "Admin", en: "Admin" },
  "president": { hi: "अध्यक्ष", mr: "अध्यक्ष", cg: "अध्यक्ष", hng: "Adhyaksh", en: "President" },
  "secretary": { hi: "सचिव", mr: "सचिव", cg: "सचिव", hng: "Sachiv", en: "Secretary" },
  "coordinator": { hi: "संयोजक", mr: "संयोजक", cg: "संयोजक", hng: "Sanyojak", en: "Coordinator" },
};

// Phonetic Multi-character Latin to Devanagari rules (ordered by length)
const PHONETIC_CONSONANTS: [RegExp, string][] = [
  [/chhh/gi, "छ"],
  [/shh/gi, "ष"],
  [/chh/gi, "छ"],
  [/kh/gi, "ख"],
  [/gh/gi, "घ"],
  [/ch/gi, "च"],
  [/jh/gi, "झ"],
  [/th/gi, "थ"],
  [/dh/gi, "ध"],
  [/ph/gi, "फ"],
  [/bh/gi, "भ"],
  [/sh/gi, "श"],
  [/zh/gi, "झ"],
  [/gy/gi, "ज्ञ"],
  [/tr/gi, "त्र"],
  [/shr/gi, "श्र"],
  [/ksh/gi, "क्ष"],
  [/k/gi, "क"],
  [/g/gi, "ग"],
  [/j/gi, "ज"],
  [/t/gi, "त"],
  [/d/gi, "द"],
  [/n/gi, "न"],
  [/p/gi, "प"],
  [/f/gi, "फ"],
  [/b/gi, "ब"],
  [/m/gi, "म"],
  [/y/gi, "य"],
  [/r/gi, "र"],
  [/l/gi, "ल"],
  [/v/gi, "व"],
  [/w/gi, "व"],
  [/s/gi, "स"],
  [/h/gi, "ह"],
  [/z/gi, "ज़"],
  [/q/gi, "क"],
  [/x/gi, "क्स"],
  [/c/gi, "क"],
];

const VOWEL_SOUNDS: [RegExp, { standalone: string; matra: string }][] = [
  [/aai/gi, { standalone: "आई", matra: "ाई" }],
  [/aau/gi, { standalone: "आऊ", matra: "ाऊ" }],
  [/ae/gi, { standalone: "ऐ", matra: "ै" }],
  [/ai/gi, { standalone: "ऐ", matra: "ै" }],
  [/au/gi, { standalone: "औ", matra: "ौ" }],
  [/oo/gi, { standalone: "ऊ", matra: "ू" }],
  [/ee/gi, { standalone: "ई", matra: "ी" }],
  [/aa/gi, { standalone: "आ", matra: "ा" }],
  [/ou/gi, { standalone: "औ", matra: "ौ" }],
  [/a/gi, { standalone: "अ", matra: "" }],
  [/i/gi, { standalone: "इ", matra: "ि" }],
  [/u/gi, { standalone: "उ", matra: "ु" }],
  [/e/gi, { standalone: "ए", matra: "े" }],
  [/o/gi, { standalone: "ओ", matra: "ो" }],
];

// Devanagari to Latin / Hinglish Mapping
const DEVA_TO_LATIN: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh",
  "ष": "sh", "स": "s", "ह": "h", "ळ": "l", "क्ष": "ksh",
  "ज्ञ": "gy", "त्र": "tr", "श्र": "shr",
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
  "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
  "ा": "a", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo",
  "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
  "ं": "n", "ः": "h", "्": "", "ँ": "n",
  "़": "", "।": ".", "॥": "."
};

/**
 * Phonetically transliterates a Latin word into Devanagari (Hindi/Marathi/Chhattisgarhi)
 */
export function transliterateLatinToDevanagari(word: string, lang: TargetLanguage = "hi"): string {
  if (!word || !/^[a-zA-Z]+$/.test(word)) return word;
  const lower = word.toLowerCase();

  // 1. Direct Vocabulary match
  if (VOCABULARY_MAP[lower]) {
    return VOCABULARY_MAP[lower][lang] || VOCABULARY_MAP[lower].hi;
  }

  // 2. High Quality Phonetic Parsing
  const tokens: string[] = [];
  let i = 0;
  const len = lower.length;

  const getChar = (idx: number) => (idx < len ? lower[idx] : "");
  const getSub = (start: number, count: number) => lower.substring(start, start + count);

  while (i < len) {
    // Check 4-char, 3-char, 2-char, 1-char consonants
    let matchedConsonant: string | null = null;
    let consLen = 0;

    for (const [re, dev] of PHONETIC_CONSONANTS) {
      const match = lower.substring(i).match(re);
      if (match && match.index === 0) {
        matchedConsonant = dev;
        consLen = match[0].length;
        break;
      }
    }

    if (matchedConsonant) {
      i += consLen;
      // Check if followed by vowel
      let matchedVowel: { standalone: string; matra: string } | null = null;
      let vowLen = 0;

      for (const [re, vObj] of VOWEL_SOUNDS) {
        const vMatch = lower.substring(i).match(re);
        if (vMatch && vMatch.index === 0) {
          matchedVowel = vObj;
          vowLen = vMatch[0].length;
          break;
        }
      }

      if (matchedVowel) {
        i += vowLen;
        // Check special end of word 'a' (inherent schwa in Hindi e.g. "Sharma" -> शर्मा vs "Ramesh" -> रमेश)
        tokens.push(matchedConsonant + (matchedVowel.matra));
      } else {
        // If followed by another consonant, apply halant except at end of word
        if (i < len) {
          tokens.push(matchedConsonant + "्");
        } else {
          tokens.push(matchedConsonant);
        }
      }
    } else {
      // Standalone vowel
      let matchedVowel: { standalone: string; matra: string } | null = null;
      let vowLen = 0;

      for (const [re, vObj] of VOWEL_SOUNDS) {
        const vMatch = lower.substring(i).match(re);
        if (vMatch && vMatch.index === 0) {
          matchedVowel = vObj;
          vowLen = vMatch[0].length;
          break;
        }
      }

      if (matchedVowel) {
        i += vowLen;
        tokens.push(matchedVowel.standalone);
      } else {
        tokens.push(getChar(i));
        i++;
      }
    }
  }

  let result = tokens.join("");
  // Cleanup any double halants or awkward trailing halants
  result = result.replace(/्+/g, "्").replace(/्$/, "");
  return result;
}

/**
 * Transliterates Devanagari text back to readable Roman Hinglish / Latin
 */
export function transliterateDevanagariToLatin(text: string): string {
  if (!text) return "";
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (DEVA_TO_LATIN[ch] !== undefined) {
      out += DEVA_TO_LATIN[ch];
    } else {
      out += ch;
    }
  }
  // Capitalize first letter of words
  return out.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Deep Omni-Translator function:
 * Converts any arbitrary text (e.g. user name, feed post, notice, city, status) into the active language!
 */
export function translateAnyText(text: string, targetLang: TargetLanguage): string {
  if (!text || typeof text !== "string") return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  // Don't modify pure numbers, URLs, or emails
  if (/^\d+$/.test(trimmed) || /^(https?:\/\/|\/|[\w.-]+@[\w.-]+)/.test(trimmed)) {
    return text;
  }

  // 1. Direct lowercase dictionary lookup
  const lower = trimmed.toLowerCase();
  if (VOCABULARY_MAP[lower]) {
    return VOCABULARY_MAP[lower][targetLang] || VOCABULARY_MAP[lower].hi;
  }

  // 2. Hinglish Mode: Convert Devanagari to Latin if needed
  if (targetLang === "hng" || targetLang === "en") {
    // If text has Devanagari characters, transliterate to Latin
    if (/[\u0900-\u097F]/.test(text)) {
      return transliterateDevanagariToLatin(text);
    }
    return text;
  }

  // 3. Native Indian Scripts (hi, mr, cg):
  // If the text contains Latin letters, transliterate word-by-word into Devanagari
  if (/[a-zA-Z]/.test(text)) {
    return text.replace(/[a-zA-Z]+/g, (match) => {
      return transliterateLatinToDevanagari(match, targetLang);
    });
  }

  // If text is already Devanagari, apply Marathi or Chhattisgarhi dialectal adjustments if appropriate
  if (targetLang === "mr") {
    return text
      .replace(/है\b/g, "आहे")
      .replace(/हैं\b/g, "आहेत")
      .replace(/का\b/g, "चे")
      .replace(/की\b/g, "ची")
      .replace(/के\b/g, "च्या")
      .replace(/नहीं\b/g, "नाही")
      .replace(/करें\b/g, "करा");
  }

  if (targetLang === "cg") {
    return text
      .replace(/है\b/g, "हे")
      .replace(/हैं\b/g, "हें")
      .replace(/का\b/g, "के")
      .replace(/की\b/g, "के")
      .replace(/नहीं\b/g, "नइ")
      .replace(/करें\b/g, "करव")
      .replace(/रहा है\b/g, "रहि हे");
  }

  return text;
}
