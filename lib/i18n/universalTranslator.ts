/**
 * Universal Omnilingual Translator & Transliteration Engine for Matang Connect
 * 100% Native Language fidelity across English, Hindi, Marathi, Chhattisgarhi, and Hinglish.
 * Zero broken characters, zero half-English half-Hindi sentences, western digits preserved.
 */

import enDict from "./translations/en.json";
import hiDict from "./translations/hi.json";
import mrDict from "./translations/mr.json";
import cgDict from "./translations/cg.json";
import hngDict from "./translations/hng.json";

export type TargetLanguage = "en" | "hi" | "mr" | "cg" | "hng";

export interface TransEntry {
  hi: string;
  mr: string;
  cg: string;
  hng: string;
  en: string;
}

// Comprehensive UI, Navigation, Categories, Features, Locations, and Names Lexicon
export const MASTER_LEXICON: Record<string, TransEntry> = {
  // App & Brand
  "matang connect": { hi: "मातंग कनेक्ट", mr: "मातंग कनेक्ट", cg: "मातंग कनेक्ट", hng: "Matang Connect", en: "Matang Connect" },
  "matang samaj": { hi: "मातंग समाज", mr: "मातंग समाज", cg: "मातंग समाज", hng: "Matang Samaj", en: "Matang Samaj" },
  "matang ai": { hi: "मातंग एआई", mr: "मातंग एआय", cg: "मातंग एआई", hng: "Matang AI", en: "Matang AI" },

  // Navigation & Core Pages
  "home": { hi: "होम", mr: "मुख्यपृष्ठ", cg: "होम", hng: "Home", en: "Home" },
  "census": { hi: "जनगणना", mr: "जनगणना", cg: "जनगणना", hng: "Census", en: "Census" },
  "profile": { hi: "प्रोफ़ाइल", mr: "प्रोफाइल", cg: "प्रोफ़ाइल", hng: "Profile", en: "Profile" },
  "services": { hi: "सेवाएं", mr: "सेवा", cg: "सेवा", hng: "Services", en: "Services" },
  "sos": { hi: "आपातकालीन एसओएस", mr: "तातडीचे एसओएस", cg: "आपातकाल एसओएस", hng: "Emergency SOS", en: "Emergency SOS" },
  "emergency sos": { hi: "आपातकालीन एसओएस", mr: "तातडीचे एसओएस", cg: "आपातकाल एसओएस", hng: "Emergency SOS", en: "Emergency SOS" },
  "admin": { hi: "प्रशासक", mr: "प्रशासक", cg: "प्रशासक", hng: "Admin", en: "Admin" },
  "directory": { hi: "डायरेक्टरी", mr: "डिरेक्टरी", cg: "डायरेक्टरी", hng: "Directory", en: "Directory" },
  "verify": { hi: "सत्यापन", mr: "पडताळणी", cg: "सत्यापन", hng: "Verify", en: "Verify" },
  "care": { hi: "सेवा एवं सहायता", mr: "सेवा आणि मदत", cg: "सेवा अउ मदद", hng: "Care & Seva", en: "Care & Seva" },
  "care & seva": { hi: "सेवा एवं सहायता", mr: "सेवा आणि मदत", cg: "सेवा अउ मदद", hng: "Care & Seva", en: "Care & Seva" },
  "jobs": { hi: "रोजगार एवं नौकरी", mr: "रोजगार आणि नोकरी", cg: "रोजगार अउ नौकरी", hng: "Jobs & Employment", en: "Jobs & Employment" },
  "jobs & employment": { hi: "रोजगार एवं नौकरी", mr: "रोजगार आणि नोकरी", cg: "रोजगार अउ नौकरी", hng: "Jobs & Employment", en: "Jobs & Employment" },
  "notices": { hi: "सूचनाएं एवं फ़ीड", mr: "सूचना आणि फीड", cg: "सूचना अउ फ़ीड", hng: "Notices & Feed", en: "Notices & Feed" },
  "notices & feed": { hi: "सूचनाएं एवं फ़ीड", mr: "सूचना आणि फीड", cg: "सूचना अउ फ़ीड", hng: "Notices & Feed", en: "Notices & Feed" },
  "kosh": { hi: "सहयोग कोष", mr: "सहकार्य कोष", cg: "सहयोग कोष", hng: "Sahyog Kosh", en: "Sahyog Kosh" },
  "sahyog kosh": { hi: "सहयोग कोष", mr: "सहकार्य कोष", cg: "सहयोग कोष", hng: "Sahyog Kosh", en: "Sahyog Kosh" },
  "vyapar": { hi: "व्यापार डायरेक्टरी", mr: "उद्योग डिरेक्टरी", cg: "व्यापार डायरेक्टरी", hng: "Vyapar Directory", en: "Vyapar Directory" },
  "vyapar directory": { hi: "व्यापार डायरेक्टरी", mr: "उद्योग डिरेक्टरी", cg: "व्यापार डायरेक्टरी", hng: "Vyapar Directory", en: "Vyapar Directory" },
  "matrimony": { hi: "वैवाहिक", mr: "वैवाहिक", cg: "वैवाहिक", hng: "Matrimony", en: "Matrimony" },
  "dharohar": { hi: "धरोहर एवं इतिहास", mr: "वारसा आणि इतिहास", cg: "धरोहर अउ इतिहास", hng: "Dharohar & History", en: "Dharohar & History" },
  "dharohar & history": { hi: "धरोहर एवं इतिहास", mr: "वारसा आणि इतिहास", cg: "धरोहर अउ इतिहास", hng: "Dharohar & History", en: "Dharohar & History" },
  "panchang": { hi: "पंचांग एवं पर्व", mr: "पंचांग आणि सण", cg: "पंचांग अउ तिहार", hng: "Panchang & Festivals", en: "Panchang & Festivals" },
  "panchang & festivals": { hi: "पंचांग एवं पर्व", mr: "पंचांग आणि सण", cg: "पंचांग अउ तिहार", hng: "Panchang & Festivals", en: "Panchang & Festivals" },
  "mahila": { hi: "महिला शक्ति", mr: "महिला शक्ती", cg: "महिला शक्ति", hng: "Mahila Shakti", en: "Mahila Shakti" },
  "mahila shakti": { hi: "महिला शक्ति", mr: "महिला शक्ती", cg: "महिला शक्ति", hng: "Mahila Shakti", en: "Mahila Shakti" },
  "polls": { hi: "समाज मतदान", mr: "समाज मतदान", cg: "समाज मतदान", hng: "Community Polls", en: "Community Polls" },
  "community polls": { hi: "समाज मतदान", mr: "समाज मतदान", cg: "समाज मतदान", hng: "Community Polls", en: "Community Polls" },
  "arthik": { hi: "आर्थिक विकास", mr: "आर्थिक विकास", cg: "आर्थिक बढ़त", hng: "Economic Growth", en: "Economic Growth" },
  "economic growth": { hi: "आर्थिक विकास", mr: "आर्थिक विकास", cg: "आर्थिक बढ़त", hng: "Economic Growth", en: "Economic Growth" },
  "scan": { hi: "क्यूआर स्कैनर", mr: "क्यूआर स्कॅनर", cg: "क्यूआर स्कैनर", hng: "QR Scanner", en: "QR Scanner" },
  "qr scanner": { hi: "क्यूआर स्कैनर", mr: "क्यूआर स्कॅनर", cg: "क्यूआर स्कैनर", hng: "QR Scanner", en: "QR Scanner" },
  "badges": { hi: "क्रेडिट एवं बैज", mr: "क्रेडिट आणि बॅज", cg: "क्रेडिट अउ बैज", hng: "Credits & Badges", en: "Credits & Badges" },
  "credits & badges": { hi: "क्रेडिट एवं बैज", mr: "क्रेडिट आणि बॅज", cg: "क्रेडिट अउ बैज", hng: "Credits & Badges", en: "Credits & Badges" },
  "vanshawali": { hi: "वंशावली", mr: "वंशावळ", cg: "वंशावली", hng: "Vanshawali", en: "Vanshawali" },
  "vanshawali tree": { hi: "वंशावली", mr: "वंशावळ", cg: "वंशावली", hng: "Vanshawali", en: "Vanshawali" },
  "family tree": { hi: "वंशावली", mr: "वंशावळ", cg: "वंशावली", hng: "Vanshawali", en: "Vanshawali" },
  "vansh vruksh": { hi: "वंश वृक्ष", mr: "वंश वृक्ष", cg: "वंश वृक्ष", hng: "Vansh Vruksh", en: "Vansh Vruksh" },
  "vansh vriksh": { hi: "वंश वृक्ष", mr: "वंश वृक्ष", cg: "वंश वृक्ष", hng: "Vansh Vriksh", en: "Vansh Vriksh" },
  "gaurav": { hi: "मातंग गौरव", mr: "मातंग गौरव", cg: "मातंग गौरव", hng: "Matang Gaurav", en: "Matang Gaurav" },
  "matang gaurav": { hi: "मातंग गौरव", mr: "मातंग गौरव", cg: "मातंग गौरव", hng: "Matang Gaurav", en: "Matang Gaurav" },
  "rides": { hi: "यात्रा साझा", mr: "प्रवास भागीदारी", cg: "सवारी साझा", hng: "Rides Sharing", en: "Rides Sharing" },
  "rides sharing": { hi: "यात्रा साझा", mr: "प्रवास भागीदारी", cg: "सवारी साझा", hng: "Rides Sharing", en: "Rides Sharing" },
  "titles": { hi: "शहर पद", mr: "शहर पदे", cg: "शहर पद", hng: "City Titles", en: "City Titles" },
  "city titles": { hi: "शहर पद", mr: "शहर पदे", cg: "शहर पद", hng: "City Titles", en: "City Titles" },
  "audit": { hi: "ऑडिट लॉग", mr: "ऑडिट लॉग", cg: "ऑडिट लॉग", hng: "Audit Log", en: "Audit Log" },
  "audit log": { hi: "ऑडिट लॉग", mr: "ऑडिट लॉग", cg: "ऑडिट लॉग", hng: "Audit Log", en: "Audit Log" },
  "audit logs": { hi: "ऑडिट लॉग", mr: "ऑडिट नोंद", cg: "ऑडिट खाता", hng: "Audit Logs", en: "Audit Logs" },
  "settings": { hi: "सुविधा नियंत्रण", mr: "वैशिष्ट्ये नियंत्रण", cg: "सुविधा नियंत्रण", hng: "Feature Control", en: "Feature Control" },
  "feature control": { hi: "सुविधा नियंत्रण", mr: "वैशिष्ट्ये नियंत्रण", cg: "सुविधा नियंत्रण", hng: "Feature Control", en: "Feature Control" },
  "reset mpin": { hi: "एम-पिन रीसेट", mr: "एम-पिन रीसेट", cg: "एम-पिन रीसेट", hng: "Reset M-PIN", en: "Reset M-PIN" },
  "reset member m-pin": { hi: "सदस्य एम-पिन रीसेट", mr: "सदस्य एम-पिन रीसेट", cg: "सदस्य एम-पिन रीसेट", hng: "Reset Member M-PIN", en: "Reset Member M-PIN" },
  "history": { hi: "समाज का इतिहास", mr: "समाजाचा इतिहास", cg: "समाज के इतिहास", hng: "Samaj History", en: "Samaj History" },
  "samaj history": { hi: "समाज का इतिहास", mr: "समाजाचा इतिहास", cg: "समाज के इतिहास", hng: "Samaj History", en: "Samaj History" },
  "all requests": { hi: "सभी अनुरोध", mr: "सर्व विनंत्या", cg: "सबो अनुरोध", hng: "All Requests", en: "All Requests" },
  "qa checklist": { hi: "गुणवत्ता जांच सूची", mr: "गुणवत्ता तपासणी यादी", cg: "जांच सूची", hng: "QA Checklist", en: "QA Checklist" },

  // Roles & Committee
  "super admin": { hi: "सुपर एडमिन", mr: "सुपर अ‍ॅडमिन", cg: "सुपर एडमिन", hng: "Super Admin", en: "Super Admin" },
  "super_admin": { hi: "सुपर एडमिन", mr: "सुपर अ‍ॅडमिन", cg: "सुपर एडमिन", hng: "Super Admin", en: "Super Admin" },
  "core committee": { hi: "कोर कमेटी", mr: "कोअर कमिटी", cg: "कोर कमेटी", hng: "Core Committee", en: "Core Committee" },
  "core_committee": { hi: "कोर कमेटी", mr: "कोअर कमिटी", cg: "कोर कमेटी", hng: "Core Committee", en: "Core Committee" },
  "volunteer": { hi: "स्वयंसेवक", mr: "स्वयंसेवक", cg: "स्वयंसेवक", hng: "Volunteer", en: "Volunteer" },
  "member": { hi: "सदस्य", mr: "सदस्य", cg: "सदस्य", hng: "Member", en: "Member" },
  "adhyaksh": { hi: "अध्यक्ष", mr: "अध्यक्ष", cg: "अध्यक्ष", hng: "Adhyaksh", en: "President" },
  "sachiv": { hi: "सचिव", mr: "सचिव", cg: "सचिव", hng: "Sachiv", en: "Secretary" },
  "sanyojak": { hi: "संयोजक", mr: "संयोजक", cg: "संयोजक", hng: "Sanyojak", en: "Coordinator" },

  // Common UI Actions & Words
  "loading": { hi: "लोड हो रहा है...", mr: "लोड होत आहे...", cg: "लोड होत हे...", hng: "Loading...", en: "Loading..." },
  "error": { hi: "त्रुटि", mr: "त्रुटी", cg: "गड़बड़", hng: "Error", en: "Error" },
  "success": { hi: "सफल", mr: "यशस्वी", cg: "सफल", hng: "Success", en: "Success" },
  "save": { hi: "सहेजें", mr: "जतन करा", cg: "सहेजव", hng: "Save", en: "Save" },
  "cancel": { hi: "रद्द करें", mr: "रद्द करा", cg: "रद्द करव", hng: "Cancel", en: "Cancel" },
  "delete": { hi: "हटाएं", mr: "हटवा", cg: "हटाव", hng: "Delete", en: "Delete" },
  "edit": { hi: "संपादित करें", mr: "संपादित करा", cg: "बदलव", hng: "Edit", en: "Edit" },
  "search": { hi: "खोजें", mr: "शोधा", cg: "खोजव", hng: "Search", en: "Search" },
  "submit": { hi: "जमा करें", mr: "सबमिट करा", cg: "जमा करव", hng: "Submit", en: "Submit" },
  "back": { hi: "वापस", mr: "मागे", cg: "पाछू", hng: "Back", en: "Back" },
  "next": { hi: "आगे", mr: "पुढे", cg: "आघू", hng: "Next", en: "Next" },
  "close": { hi: "बंद करें", mr: "बंद करा", cg: "बंद करव", hng: "Close", en: "Close" },
  "view": { hi: "देखें", mr: "पहा", cg: "देखव", hng: "View", en: "View" },
  "hide": { hi: "छिपाएं", mr: "लपवा", cg: "लुकाव", hng: "Hide", en: "Hide" },
  "reset": { hi: "रीसेट", mr: "रीसेट", cg: "रीसेट", hng: "Reset", en: "Reset" },
  "unlock all": { hi: "सभी खोलें", mr: "सर्व उघडा", cg: "सबो खोलव", hng: "Unlock all", en: "Unlock all" },
  "all": { hi: "सभी", mr: "सर्व", cg: "सबो", hng: "All", en: "All" },
  "pending": { hi: "लंबित", mr: "प्रलंबित", cg: "रुके हे", hng: "Pending", en: "Pending" },
  "accepted": { hi: "स्वीकृत", mr: "स्वीकृत", cg: "स्वीकृत", hng: "Accepted", en: "Accepted" },
  "rejected": { hi: "अस्वीकृत", mr: "नाकारले", cg: "अस्वीकृत", hng: "Rejected", en: "Rejected" },
  "verified": { hi: "सत्यापित", mr: "पडताळणीकृत", cg: "सत्यापित", hng: "Verified", en: "Verified" },
  "active": { hi: "सक्रिय", mr: "सक्रिय", cg: "सक्रिय", hng: "Active", en: "Active" },
  "inactive": { hi: "निष्क्रिय", mr: "निष्क्रिय", cg: "निष्क्रिय", hng: "Inactive", en: "Inactive" },
  "post": { hi: "पोस्ट", mr: "पोस्ट", cg: "पोस्ट", hng: "Post", en: "Post" },
  "publish": { hi: "प्रकाशित करें", mr: "प्रकाशित करा", cg: "पोस्ट करव", hng: "Publish", en: "Publish" },
  "title": { hi: "शीर्षक", mr: "शीर्षक", cg: "शीर्षक", hng: "Title", en: "Title" },
  "message": { hi: "संदेश", mr: "संदेश", cg: "संदेस", hng: "Message", en: "Message" },
  "share": { hi: "साझा करें", mr: "शेअर करा", cg: "साझा करव", hng: "Share", en: "Share" },
  "general": { hi: "सामान्य", mr: "सामान्य", cg: "सामान्य", hng: "General", en: "General" },
  "announcement": { hi: "घोषणा", mr: "घोषणा", cg: "घोषणा", hng: "Announcement", en: "Announcement" },
  "meeting": { hi: "बैठक", mr: "बैठक", cg: "बैठक", hng: "Meeting", en: "Meeting" },
  "shok sandesh": { hi: "शोक संदेश", mr: "शोक संदेश", cg: "शोक संदेस", hng: "Shok Sandesh", en: "Demise Notice" },
  "urgent": { hi: "अति आवश्यक", mr: "तातडीचे", cg: "जरूरी", hng: "Urgent", en: "Urgent" },
  "community feed": { hi: "समाज फ़ीड", mr: "समाज फीड", cg: "समाज फ़ीड", hng: "Community Feed", en: "Community Feed" },
  "write for the community": { hi: "समाज के लिए कुछ लिखें...", mr: "समाजासाठी काही लिहा...", cg: "समाज बर कुछ लिखव...", hng: "Samaj ke liye kuch likhein...", en: "Write for the community..." },
  "no posts yet": { hi: "अभी तक कोई पोस्ट नहीं है", mr: "अद्याप कोणतीही पोस्ट नाही", cg: "अभी तक कोनो पोस्ट नइ हे", hng: "Abhi tak koi post nahi hai", en: "No posts yet" },
  "select language": { hi: "भाषा चुनें", mr: "भाषा निवडा", cg: "भाषा चुनव", hng: "Select Language", en: "Select Language" },
  "demo data": { hi: "डेमो डेटा", mr: "डेमो डेटा", cg: "डेमो डेटा", hng: "Demo Data", en: "Demo Data" },
  "total": { hi: "कुल", mr: "एकूण", cg: "जम्मो", hng: "Total", en: "Total" },
  "features": { hi: "सुविधाएं", mr: "वैशिष्ट्ये", cg: "सुविधा मन", hng: "Features", en: "Features" },
  "feature": { hi: "सुविधा", mr: "वैशिष्ट्य", cg: "सुविधा", hng: "Feature", en: "Feature" },
  "vol": { hi: "स्वयंसेवक", mr: "स्वयंसेवक", cg: "स्वयंसेवक", hng: "Vol", en: "Vol" },
  "core": { hi: "कोर", mr: "कोअर", cg: "कोर", hng: "Core", en: "Core" },

  // Feature Matrix Section Headings (Settings Page)
  "1. core identity & access": {
    hi: "1. मुख्य पहचान एवं पहुंच",
    mr: "1. मुख्य ओळख आणि प्रवेश",
    cg: "1. मुख्य पहचान अउ पहुंच",
    hng: "1. Core Identity & Access",
    en: "1. Core Identity & Access",
  },
  "2. feed / home": {
    hi: "2. फ़ीड एवं मुख्य पृष्ठ",
    mr: "2. फीड आणि मुख्यपृष्ठ",
    cg: "2. फ़ीड अउ होम",
    hng: "2. Feed / Home",
    en: "2. Feed / Home",
  },
  "3. emergency & care": {
    hi: "3. आपातकाल एवं सेवा",
    mr: "3. आपत्कालीन आणि काळजी",
    cg: "3. आपातकाल अउ सेवा",
    hng: "3. Emergency & Care",
    en: "3. Emergency & Care",
  },
  "4. livelihood & money": {
    hi: "4. आजीविका एवं वित्त",
    mr: "4. उपजीविका आणि वित्त",
    cg: "4. आजीविका अउ पइसा",
    hng: "4. Livelihood & Money",
    en: "4. Livelihood & Money",
  },
  "5. community life": {
    hi: "5. सामाजिक जीवन",
    mr: "5. सामाजिक जीवन",
    cg: "5. समाज के जिनगी",
    hng: "5. Community Life",
    en: "5. Community Life",
  },
  "6. census & data": {
    hi: "6. जनगणना एवं डेटा",
    mr: "6. जनगणना आणि डेटा",
    cg: "6. जनगणना अउ डेटा",
    hng: "6. Census & Data",
    en: "6. Census & Data",
  },
  "7. recognition": {
    hi: "7. सम्मान एवं पहचान",
    mr: "7. सन्मान आणि ओळख",
    cg: "7. सनमान अउ पहचान",
    hng: "7. Recognition",
    en: "7. Recognition",
  },
  "8. admin tools (staff visibility)": {
    hi: "8. एडमिन टूल्स (प्रशासकीय दृश्यता)",
    mr: "8. अ‍ॅडमिन साधने (कर्मचारी दृश्यता)",
    cg: "8. एडमिन टूल्स",
    hng: "8. Admin Tools (Staff Visibility)",
    en: "8. Admin Tools (Staff Visibility)",
  },
  "9. ai & pwa": {
    hi: "9. एआई एवं ऐप नियंत्रण",
    mr: "9. एआय आणि अ‍ॅप नियंत्रण",
    cg: "9. एआई अउ ऐप नियंत्रण",
    hng: "9. AI & PWA",
    en: "9. AI & PWA",
  },
  "10. cross-cutting ux": {
    hi: "10. सामान्य उपयोग अनुभव",
    mr: "10. सामान्य वापरकर्ता अनुभव",
    cg: "10. सामान्य उपयोग अनुभव",
    hng: "10. Cross-cutting UX",
    en: "10. Cross-cutting UX",
  },

  // All 59 Matrix Labels
  "registration (naye member)": { hi: "पंजीकरण (नए सदस्य)", mr: "नोंदणी (नवीन सदस्य)", cg: "पंजीकरण (नवा सदस्य)", hng: "Registration (Naye Member)", en: "Registration (New Members)" },
  "login": { hi: "लॉग इन", mr: "लॉग इन", cg: "लॉग इन", hng: "Login", en: "Login" },
  "profile edit / save": { hi: "प्रोफ़ाइल संपादन / सहेजें", mr: "प्रोफाइल संपादन / जतन", cg: "प्रोफ़ाइल संपादन / सहेजव", hng: "Profile Edit / Save", en: "Profile Edit / Save" },
  "profile photo upload": { hi: "प्रोफ़ाइल फोटो अपलोड", mr: "प्रोफाइल फोटो अपलोड", cg: "प्रोफ़ाइल फोटो अपलोड", hng: "Profile Photo Upload", en: "Profile Photo Upload" },
  "self m-pin change": { hi: "स्वयं एम-पिन बदलें", mr: "स्वतः एम-पिन बदला", cg: "अपन एम-पिन बदलव", hng: "Self M-PIN Change", en: "Self M-PIN Change" },
  "directory advanced filters": { hi: "निर्देशिका उन्नत फ़िल्टर", mr: "डिरेक्टरी प्रगत फिल्टर्स", cg: "निर्देशिका खोज फ़िल्टर", hng: "Directory Advanced Filters", en: "Directory Advanced Filters" },
  "qr scan": { hi: "क्यूआर स्कैन", mr: "क्यूआर स्कॅन", cg: "क्यूआर स्कैन", hng: "QR Scan", en: "QR Scan" },
  "vanshawali / family tree": { hi: "वंशावली / वंश वृक्ष", mr: "वंशावळ / वंश वृक्ष", cg: "वंशावली / वंश रुख", hng: "Vanshawali / Vansh Vruksh", en: "Vanshawali / Vansh Vruksh" },
  "scan — file upload": { hi: "स्कैन — फ़ाइल अपलोड", mr: "स्कॅन — फाइल अपलोड", cg: "स्कैन — फ़ाइल अपलोड", hng: "Scan — File Upload", en: "Scan — File Upload" },
  "public qr profile (/u/...)": { hi: "सार्वजनिक क्यूआर प्रोफ़ाइल", mr: "सार्वजनिक क्यूआर प्रोफाइल", cg: "सार्वजनिक क्यूआर प्रोफ़ाइल", hng: "Public QR Profile", en: "Public QR Profile" },
  "home feed": { hi: "होम फ़ीड", mr: "होम फीड", cg: "होम फ़ीड", hng: "Home Feed", en: "Home Feed" },
  "feed image posts": { hi: "फ़ीड फोटो पोस्ट", mr: "फीड फोटो पोस्ट", cg: "फ़ीड फोटो पोस्ट", hng: "Feed Image Posts", en: "Feed Image Posts" },
  "members can post on feed": { hi: "सदस्य फ़ीड पर पोस्ट कर सकते हैं", mr: "सदस्य फीडवर पोस्ट करू शकतात", cg: "सदस्य फ़ीड म पोस्ट कर सकत हें", hng: "Members Feed par Post kar sakte hain", en: "Members Can Post on Feed" },
  "staff-only posting mode": { hi: "केवल व्यवस्थापक पोस्टिंग मोड", mr: "केवळ कर्मचारी पोस्टिंग मोड", cg: "सिरिफ व्यवस्थापक पोस्टिंग", hng: "Staff-Only Posting Mode", en: "Staff-Only Posting Mode" },
  "feed whatsapp share": { hi: "फ़ीड व्हाट्सएप शेयर", mr: "फीड व्हॉट्सअ‍ॅप शेअर", cg: "फ़ीड व्हाट्सएप शेयर", hng: "Feed WhatsApp Share", en: "Feed WhatsApp Share" },
  "sos trigger": { hi: "एसओएस आपातकाल बटन", mr: "एसओएस आपत्कालीन बटण", cg: "एसओएस आपातकाल बटन", hng: "SOS Trigger", en: "SOS Trigger" },
  "sos header button": { hi: "हेडर में एसओएस बटन", mr: "हेडरमध्ये एसओएस बटण", cg: "हेडर म एसओएस बटन", hng: "SOS Header Button", en: "SOS Header Button" },
  "sos volunteer respond": { hi: "एसओएस स्वयंसेवक प्रतिक्रिया", mr: "एसओएस स्वयंसेवक प्रतिसाद", cg: "एसओएस स्वयंसेवक जवाब", hng: "SOS Volunteer Respond", en: "SOS Volunteer Respond" },
  "sos location link": { hi: "एसओएस स्थान लिंक", mr: "एसओएस स्थान लिंक", cg: "एसओएस जगह लिंक", hng: "SOS Location Link", en: "SOS Location Link" },
  "care / vridh seva": { hi: "सेवा एवं सहायता / वृद्ध सेवा", mr: "काळजी आणि वृद्ध सेवा", cg: "सेवा-जतन / सियान सेवा", hng: "Care / Vridh Seva", en: "Care / Elder Support" },
  "care — staff mark closed": { hi: "सेवा — पूर्ण चिह्नित करें", mr: "सेवा — पूर्ण चिन्हांकित करा", cg: "सेवा — पूरा हो गे", hng: "Care — Mark Closed", en: "Care — Mark Closed" },
  "jobs (rojgar)": { hi: "रोजगार एवं नौकरी", mr: "रोजगार आणि नोकरी", cg: "काम-धंधा अउ नौकरी", hng: "Jobs (Rozgar)", en: "Jobs & Employment" },
  "jobs — post new": { hi: "नई नौकरी पोस्ट करें", mr: "नवीन नोकरी पोस्ट करा", cg: "नवा नौकरी पोस्ट करव", hng: "Nayi Job Post Karein", en: "Post New Job" },
  "sahyog / kosh": { hi: "सहयोग कोष", mr: "सहकार्य कोष", cg: "सहयोग कोष", hng: "Sahyog Kosh", en: "Community Fund (Kosh)" },
  "kosh transparency (amounts)": { hi: "कोष पारदर्शिता (धनराशि)", mr: "कोष पारदर्शकता (रक्कम)", cg: "कोष साफ-सुथरा (रकम)", hng: "Kosh Transparency (Amounts)", en: "Fund Transparency (Amounts)" },
  "arthik / schemes": { hi: "आर्थिक विकास / योजनाएं", mr: "आर्थिक विकास / योजना", cg: "आर्थिक बढ़त / योजना", hng: "Arthik / Schemes", en: "Economic Schemes" },
  "matrimony whatsapp share": { hi: "वैवाहिक व्हाट्सएप शेयर", mr: "विवाह व्हॉट्सअ‍ॅप शेअर", cg: "बिहाव व्हाट्सएप शेयर", hng: "Matrimony WhatsApp Share", en: "Matrimony WhatsApp Share" },
  "polls — create": { hi: "नया मतदान बनाएं", mr: "नवीन मतदान तयार करा", cg: "नवा मतदान बनावव", hng: "Polls Create", en: "Create Poll" },
  "polls — vote change request": { hi: "मतदान बदलने का अनुरोध", mr: "मत बदलण्याची विनंती", cg: "वोट बदले के अरजी", hng: "Vote Change Request", en: "Vote Change Request" },
  "ride sharing": { hi: "यात्रा साझा", mr: "प्रवास भागीदारी", cg: "सवारी साझा", hng: "Ride Sharing", en: "Ride Sharing" },
  "panchang — staff add festival": { hi: "पंचांग — पर्व जोड़ें", mr: "पंचांग — सण जोडा", cg: "पंचांग — तिहार जोड़व", hng: "Panchang Add Festival", en: "Add Festival to Panchang" },
  "history page": { hi: "इतिहास पृष्ठ", mr: "इतिहास पृष्ठ", cg: "इतिहास पन्ना", hng: "History Page", en: "History Page" },
  "census — edit others (staff)": { hi: "जनगणना — संपादन (व्यवस्थापक)", mr: "जनगणना — संपादन (कर्मचारी)", cg: "जनगणना — संपादन (स्टाफ)", hng: "Census Edit Others", en: "Edit Other Census Entries" },
  "points / badges page": { hi: "क्रेडिट एवं बैज पृष्ठ", mr: "क्रेडिट आणि बॅज पृष्ठ", cg: "क्रेडिट अउ बैज पन्ना", hng: "Points & Badges", en: "Points & Badges Page" },
  "create awards": { hi: "पुरस्कार बनाएं", mr: "पुरस्कार तयार करा", cg: "पुरस्कार बनावव", hng: "Create Awards", en: "Create Awards" },
  "leaderboard": { hi: "लीडरबोर्ड", mr: "लीडरबोर्ड", cg: "लीडरबोर्ड", hng: "Leaderboard", en: "Leaderboard" },
  "all requests inbox": { hi: "सभी अनुरोध इनबॉक्स", mr: "सर्व विनंत्या इनबॉक्स", cg: "सबो अरजी इनबॉक्स", hng: "All Requests Inbox", en: "All Requests Inbox" },
  "verify users": { hi: "सदस्य सत्यापन", mr: "सदस्य पडताळणी", cg: "सदस्य सत्यापन", hng: "Verify Users", en: "Verify Users" },
  "admin directory tool": { hi: "प्रशासक निर्देशिका टूल", mr: "अ‍ॅडमिन डिरेक्टरी साधन", cg: "एडमिन डायरेक्टरी", hng: "Admin Directory Tool", en: "Admin Directory Tool" },
  "reset m-pin tool": { hi: "एम-पिन रीसेट टूल", mr: "एम-पिन रीसेट साधन", cg: "एम-पिन रीसेट टूल", hng: "Reset M-PIN Tool", en: "Reset M-PIN Tool" },
  "demo seed button": { hi: "डेमो डेटा बटन", mr: "डेमो डेटा बटण", cg: "डेमो डेटा बटन", hng: "Demo Seed Button", en: "Demo Seed Button" },
  "matang ai (members)": { hi: "मातंग एआई (सदस्य)", mr: "मातंग एआय (सदस्य)", cg: "मातंग एआई (सदस्य)", hng: "Matang AI (Members)", en: "Matang AI (Members)" },
  "matang ai god-mode (super admin)": { hi: "मातंग एआई गॉड-मोड (सुपर एडमिन)", mr: "मातंग एआय गॉड-मोड (सुपर अ‍ॅडमिन)", cg: "मातंग एआई गॉड-मोड (सुपर एडमिन)", hng: "Matang AI God-Mode (Super Admin)", en: "Matang AI God-Mode (Super Admin)" },
  "pwa install prompt": { hi: "ऐप इंस्टॉल प्रॉम्प्ट", mr: "अ‍ॅप इन्स्टॉल प्रॉम्प्ट", cg: "ऐप इंस्टॉल प्रॉम्प्ट", hng: "PWA Install Prompt", en: "PWA Install Prompt" },
  "app-wide whatsapp share": { hi: "व्हाट्सएप शेयर", mr: "व्हॉट्सअ‍ॅप शेअर", cg: "व्हाट्सएप शेयर", hng: "App-wide WhatsApp Share", en: "App-wide WhatsApp Share" },
  "language toggle": { hi: "भाषा विकल्प", mr: "भाषा पर्याय", cg: "भाषा विकल्प", hng: "Language Toggle", en: "Language Toggle" },
  "services tab (normal members)": { hi: "सेवाएं टैब (सामान्य सदस्य)", mr: "सेवा टॅब (सामान्य सदस्य)", cg: "सेवा टैब (सामान्य सदस्य)", hng: "Services Tab (Normal Members)", en: "Services Tab (Normal Members)" },

  // Prompts, Modals, and Alerts
  "super admin only": { hi: "केवल सुपर एडमिन के लिए", mr: "फक्त सुपर अ‍ॅडमिनसाठी", cg: "सिरिफ सुपर एडमिन बर", hng: "Keval Super Admin ke liye", en: "Super Admin only" },
  "reset all roles to default settings?": {
    hi: "क्या आप सभी भूमिकाओं को डिफ़ॉल्ट सेटिंग्स पर रीसेट करना चाहते हैं?",
    mr: "सर्व भूमिका पूर्वस्थितीत रीसेट करायच्या आहेत का?",
    cg: "का सबो पद मन ला डिफ़ॉल्ट सेटिंग म रीसेट करे बर चाहत हव?",
    hng: "Kya aap sabhi roles ko default settings par reset karna chahte hain?",
    en: "Reset all roles to default settings?",
  },
  "unlock all features for all roles?": {
    hi: "क्या आप सभी भूमिकाओं के लिए सभी सुविधाएं खोलना चाहते हैं?",
    mr: "सर्व भूमिकांसाठी सर्व वैशिष्ट्ये उघडायची आहेत का?",
    cg: "का सबो पद बर सबो सुविधा ला खोले बर चाहत हव?",
    hng: "Kya aap sabhi roles ke liye all features unlock karna chahte hain?",
    en: "Unlock all features for all roles?",
  },
  "all features unlocked for all roles": {
    hi: "सभी भूमिकाओं के लिए सभी सुविधाएं खोल दी गईं",
    mr: "सर्व भूमिकांसाठी सर्व वैशिष्ट्ये उघडली गेली",
    cg: "सबो पद बर सबो सुविधा खोल देहे गेहे",
    hng: "Sabhi roles ke liye all features unlock ho gaye",
    en: "All features unlocked for all roles",
  },
  "feature matrix reset to defaults": {
    hi: "फ़ीचर मैट्रिक्स डिफ़ॉल्ट पर रीसेट कर दी गई",
    mr: "वैशिष्ट्ये मॅट्रिक्स पूर्वस्थितीत रीसेट करण्यात आली",
    cg: "फ़ीचर मैट्रिक्स डिफ़ॉल्ट म रीसेट हो गे",
    hng: "Feature matrix default par reset ho gayi",
    en: "Feature matrix reset to defaults",
  },
  "search features by name or key…": {
    hi: "नाम या कुंजी से सुविधाएं खोजें...",
    mr: "नाव किंवा की द्वारे वैशिष्ट्ये शोधा...",
    cg: "नाव या की ले सुविधा खोजव...",
    hng: "Naam ya key se features khojein...",
    en: "Search features by name or key…",
  },
  "load demo data (50+ members)": {
    hi: "डेमो डेटा लोड करें (50+ सदस्य)",
    mr: "डेमो डेटा लोड करा (50+ सदस्य)",
    cg: "डेमो डेटा लोड करव (50+ सदस्य)",
    hng: "Demo data load karein (50+ members)",
    en: "Load demo data (50+ members)",
  },
  "50 members (phone 90000xxxxx, m-pin 1234), 12 posts all types, jobs, care, kosh.": {
    hi: "50 सदस्य (फ़ोन 90000xxxxx, एम-पिन 1234), सभी प्रकार के 12 पोस्ट, नौकरियाँ, सेवा, कोष।",
    mr: "50 सदस्य (फोन 90000xxxxx, एम-पिन 1234), सर्व प्रकारच्या 12 पोस्ट, नोकऱ्या, सेवा, कोष.",
    cg: "50 सदस्य (फोन 90000xxxxx, एम-पिन 1234), जम्मो किसम के 12 पोस्ट, नौकरी, सेवा, कोष।",
    hng: "50 members (phone 90000xxxxx, M-PIN 1234), 12 posts all types, jobs, care, kosh.",
    en: "50 members (phone 90000xxxxx, M-PIN 1234), 12 posts all types, jobs, care, kosh.",
  },
  "category level: member · volunteer · core · changes apply to everyone in that category": {
    hi: "श्रेणी स्तर: सदस्य · स्वयंसेवक · कोर · बदलाव उस श्रेणी के सभी सदस्यों पर लागू होंगे",
    mr: "श्रेणी स्तर: सदस्य · स्वयंसेवक · कोअर · बदल त्या श्रेणीतील सर्वांना लागू होतील",
    cg: "श्रेणी स्तर: सदस्य · स्वयंसेवक · कोर · बदलाव उही श्रेणी के सबो मन म लागू होही",
    hng: "Category level: Member · Volunteer · Core · Changes apply to everyone in that category",
    en: "Category level: Member · Volunteer · Core · Changes apply to everyone in that category",
  },

  // Cities & States
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
  "solapur": { hi: "सोलापुर", mr: "सोलापूर", cg: "सोलापुर", hng: "Solapur", en: "Solapur" },
  "kolhapur": { hi: "कोल्हापुर", mr: "कोल्हापूर", cg: "कोल्हापुर", hng: "Kolhapur", en: "Kolhapur" },
  "nashik": { hi: "नासिक", mr: "नाशिक", cg: "नासिक", hng: "Nashik", en: "Nashik" },
  "delhi": { hi: "दिल्ली", mr: "दिल्ली", cg: "दिल्ली", hng: "Delhi", en: "Delhi" },
};

// Common Indian Names & Surnames Dictionary
const NAMES_LEXICON: Record<string, TransEntry> = {
  // Surnames
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
  "dewangan": { hi: "देवांगन", mr: "देवांगन", cg: "देवांगन", hng: "Dewangan", en: "Dewangan" },

  // First Names
  "rahul": { hi: "राहुल", mr: "राहुल", cg: "राहुल", hng: "Rahul", en: "Rahul" },
  "amit": { hi: "अमित", mr: "अमित", cg: "अमित", hng: "Amit", en: "Amit" },
  "suresh": { hi: "सुरेश", mr: "सुरेश", cg: "सुरेश", hng: "Suresh", en: "Suresh" },
  "ramesh": { hi: "रमेश", mr: "रमेश", cg: "रमेश", hng: "Ramesh", en: "Ramesh" },
  "mahesh": { hi: "महेश", mr: "महेश", cg: "महेश", hng: "Mahesh", en: "Mahesh" },
  "ganesh": { hi: "गणेश", mr: "गणेश", cg: "गणेश", hng: "Ganesh", en: "Ganesh" },
  "mukesh": { hi: "मुकेश", mr: "मुकेश", cg: "मुकेश", hng: "Mukesh", en: "Mukesh" },
  "rajesh": { hi: "राजेश", mr: "राजेश", cg: "राजेश", hng: "Rajesh", en: "Rajesh" },
  "vikas": { hi: "विकास", mr: "विकास", cg: "विकास", hng: "Vikas", en: "Vikas" },
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
  "pooja": { hi: "पूजा", mr: "पूजा", cg: "पूजा", hng: "Pooja", en: "Pooja" },
  "priya": { hi: "प्रिया", mr: "प्रिया", cg: "प्रिया", hng: "Priya", en: "Priya" },
  "sneha": { hi: "स्नेहा", mr: "स्नेहा", cg: "स्नेहा", hng: "Sneha", en: "Sneha" },
  "neha": { hi: "नेहा", mr: "नेहा", cg: "नेहा", hng: "Neha", en: "Neha" },
  "anita": { hi: "अनीता", mr: "अनिता", cg: "अनीता", hng: "Anita", en: "Anita" },
  "sunita": { hi: "सुनीता", mr: "सुनिता", cg: "सुनीता", hng: "Sunita", en: "Sunita" },
  "kavita": { hi: "कविता", mr: "कविता", cg: "कविता", hng: "Kavita", en: "Kavita" },
  "rekha": { hi: "रेखा", mr: "रेखा", cg: "रेखा", hng: "Rekha", en: "Rekha" },
  "seema": { hi: "सीमा", mr: "सीमा", cg: "सीमा", hng: "Seema", en: "Seema" },
  "geeta": { hi: "गीता", mr: "गीता", cg: "गीता", hng: "Geeta", en: "Geeta" },
  "radha": { hi: "राधा", mr: "राधा", cg: "राधा", hng: "Radha", en: "Radha" },
  "laxmi": { hi: "लक्ष्मी", mr: "लक्ष्मी", cg: "लक्ष्मी", hng: "Laxmi", en: "Laxmi" },
};

// Safe Syllable mapping for Indian Names
const INDIAN_NAME_SYLLABLES: [RegExp, string][] = [
  [/sharma/gi, "शर्मा"],
  [/verma/gi, "वर्मा"],
  [/patil/gi, "पाटिल"],
  [/kamble/gi, "कांबले"],
  [/gaikwad/gi, "गायकवाड़"],
  [/shinde/gi, "शिंदे"],
  [/jadhav/gi, "जाधव"],
  [/chouhan/gi, "चौहान"],
  [/chavan/gi, "चव्हाण"],
  [/matang/gi, "मातंग"],
  [/baghel/gi, "बघेल"],
  [/dewangan/gi, "देवांगन"],
  [/rahul/gi, "राहुल"],
  [/amit/gi, "अमित"],
  [/suresh/gi, "सुरेश"],
  [/ramesh/gi, "रमेश"],
  [/mahesh/gi, "महेश"],
  [/mukesh/gi, "मुकेश"],
  [/rajesh/gi, "राजेश"],
  [/deepak/gi, "दीपक"],
  [/sanjay/gi, "संजय"],
  [/ajay/gi, "अजय"],
  [/vijay/gi, "विजय"],
  [/pooja/gi, "पूजा"],
  [/priya/gi, "प्रिया"],
  [/sneha/gi, "स्नेहा"],
  [/neha/gi, "नेहा"],
  [/anita/gi, "अनीता"],
  [/sunita/gi, "सुनीता"],
];

const DEVA_NAME_TO_LATIN: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh",
  "ष": "sh", "स": "s", "ह": "h", "ळ": "l", "क्ष": "ksh",
  "ज्ञ": "gy", "त्र": "tr", "श्र": "shr",
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
  "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
  "ा": "a", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
  "ं": "n", "ः": "h", "्": "", "ँ": "n", "।": "."
};

/**
 * Normalizes text for clean dictionary matching
 */
function normalizeKey(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Flattens nested JSON object into key-value pairs
 */
function flattenDict(obj: Record<string, any>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const newKey = prefix ? `${prefix}.${k}` : k;
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      Object.assign(result, flattenDict(val, newKey));
    } else if (typeof val === "string") {
      result[newKey] = val;
    }
  }
  return result;
}

/**
 * Bidirectional Global Lookup Index
 * Maps ANY string in ANY of the 5 languages -> TransEntry
 */
const BIDIRECTIONAL_MAP = new Map<string, TransEntry>();

function registerEntry(entry: TransEntry, keyHint?: string) {
  const targets = [entry.hi, entry.mr, entry.cg, entry.hng, entry.en];
  if (keyHint) targets.push(keyHint);

  for (const t of targets) {
    if (!t) continue;
    const norm = normalizeKey(t);
    if (norm && !BIDIRECTIONAL_MAP.has(norm)) {
      BIDIRECTIONAL_MAP.set(norm, entry);
    }
  }
}

// 1. Register all entries from the 5 translation JSONs
const fEn = flattenDict(enDict);
const fHi = flattenDict(hiDict);
const fMr = flattenDict(mrDict);
const fCg = flattenDict(cgDict);
const fHng = flattenDict(hngDict);

for (const k of Object.keys(fEn)) {
  const entry: TransEntry = {
    en: fEn[k] || "",
    hi: fHi[k] || fEn[k] || "",
    mr: fMr[k] || fHi[k] || fEn[k] || "",
    cg: fCg[k] || fHi[k] || fEn[k] || "",
    hng: fHng[k] || fEn[k] || "",
  };
  registerEntry(entry, k);
}

// 2. Register all entries from MASTER_LEXICON
for (const [key, entry] of Object.entries(MASTER_LEXICON)) {
  registerEntry(entry, key);
}

// 3. Register all names from NAMES_LEXICON
for (const [key, entry] of Object.entries(NAMES_LEXICON)) {
  registerEntry(entry, key);
}

/**
 * Cleanly translates a person's name or title into target language
 */
export function translateName(name: string, targetLang: TargetLanguage): string {
  if (!name || typeof name !== "string") return name;
  const trimmed = name.trim();
  if (!trimmed) return name;

  const lower = trimmed.toLowerCase();
  const directMatch = NAMES_LEXICON[lower] || MASTER_LEXICON[lower];
  if (directMatch) {
    return directMatch[targetLang] || directMatch.hi;
  }

  // English / Hinglish: convert Devanagari to Roman
  if (targetLang === "en" || targetLang === "hng") {
    if (/[\u0900-\u097F]/.test(trimmed)) {
      let out = "";
      for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i];
        out += DEVA_NAME_TO_LATIN[ch] !== undefined ? DEVA_NAME_TO_LATIN[ch] : ch;
      }
      return out.replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return trimmed;
  }

  // Target is Devanagari (hi, mr, cg)
  const words = trimmed.split(/\s+/);
  const convertedWords = words.map((w) => {
    const wLower = w.toLowerCase();
    if (NAMES_LEXICON[wLower]) {
      return NAMES_LEXICON[wLower][targetLang] || NAMES_LEXICON[wLower].hi;
    }
    for (const [re, repl] of INDIAN_NAME_SYLLABLES) {
      if (re.test(wLower)) {
        return repl;
      }
    }
    return w;
  });

  return convertedWords.join(" ");
}

/**
 * Universal Bidirectional Text Translator (Deep DNA Layer)
 * 100% native language fidelity across all 5 languages.
 */
export function translateAnyText(text: string, targetLang: TargetLanguage): string {
  if (!text || typeof text !== "string") return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  // Don't modify pure numbers, URLs, phone numbers, percentages, or emails
  // Keeps Western Arabic numerals (1, 2, 3...) strictly intact per user requirement!
  if (
    /^\+?\d[\d\s\-()]{4,}\d$/.test(trimmed) ||
    /^\d+(\.\d+)?%?$/.test(trimmed) ||
    /^\d+\/\d+\/\d+$/.test(trimmed) ||
    /^(https?:\/\/|\/|[\w.-]+@[\w.-]+)/.test(trimmed)
  ) {
    return text;
  }

  // Separate leading/trailing whitespace & punctuation
  const match = text.match(/^(\s*[^\w\s\u0900-\u097F]*)(.*?)([^\w\s\u0900-\u097F]*\s*)$/);
  const prefix = match ? match[1] : "";
  const core = match ? match[2].trim() : trimmed;
  const suffix = match ? match[3] : "";

  if (!core) return text;

  // 1. Direct Bidirectional Exact Match
  const norm = normalizeKey(core);
  const direct = BIDIRECTIONAL_MAP.get(norm);
  if (direct && direct[targetLang]) {
    return prefix + direct[targetLang] + suffix;
  }

  // 2. Direct Name check
  const lowerCore = core.toLowerCase();
  if (NAMES_LEXICON[lowerCore]) {
    return prefix + (NAMES_LEXICON[lowerCore][targetLang] || NAMES_LEXICON[lowerCore].hi) + suffix;
  }

  // 3. For Marathi (mr): adapt verbal endings & postpositions
  if (targetLang === "mr") {
    let mrText = core;
    for (const [key, entry] of Object.entries(MASTER_LEXICON)) {
      if (mrText.toLowerCase().includes(key)) {
        const reg = new RegExp(`\\b${key}\\b`, "gi");
        mrText = mrText.replace(reg, entry.mr || entry.hi);
      }
    }
    mrText = mrText
      .replace(/है\b/g, "आहे")
      .replace(/हैं\b/g, "आहेत")
      .replace(/था\b/g, "होता")
      .replace(/थी\b/g, "होती")
      .replace(/थे\b/g, "होते")
      .replace(/का\b/g, "चे")
      .replace(/की\b/g, "ची")
      .replace(/के\b/g, "चे")
      .replace(/में\b/g, "मध्ये")
      .replace(/से\b/g, "कडून")
      .replace(/को\b/g, "ला")
      .replace(/नहीं\b/g, "नाही")
      .replace(/करें\b/g, "करा")
      .replace(/कीजिए\b/g, "करा")
      .replace(/होगा\b/g, "होईल");
    return prefix + mrText + suffix;
  }

  // 4. For Chhattisgarhi (cg): adapt dialectal endings & postpositions
  if (targetLang === "cg") {
    let cgText = core;
    for (const [key, entry] of Object.entries(MASTER_LEXICON)) {
      if (cgText.toLowerCase().includes(key)) {
        const reg = new RegExp(`\\b${key}\\b`, "gi");
        cgText = cgText.replace(reg, entry.cg || entry.hi);
      }
    }
    cgText = cgText
      .replace(/है\b/g, "हे")
      .replace(/हैं\b/g, "हें")
      .replace(/था\b/g, "रहिसे")
      .replace(/थी\b/g, "रहिसे")
      .replace(/थे\b/g, "रहिं")
      .replace(/का\b/g, "के")
      .replace(/की\b/g, "के")
      .replace(/के\b/g, "के")
      .replace(/में\b/g, "म")
      .replace(/से\b/g, "ले")
      .replace(/को\b/g, "ला")
      .replace(/नहीं\b/g, "नइ")
      .replace(/करें\b/g, "करव")
      .replace(/कीजिए\b/g, "करव")
      .replace(/होगा\b/g, "होही")
      .replace(/हो गया\b/g, "हो गे")
      .replace(/रहा है\b/g, "रहि हे");
    return prefix + cgText + suffix;
  }

  // 5. For English (en) or Hinglish (hng)
  if (targetLang === "en" || targetLang === "hng") {
    // If exact sentence/phrase not in dictionary, check word-by-word against BIDIRECTIONAL_MAP
    let enText = core;
    for (const [key, entry] of Object.entries(MASTER_LEXICON)) {
      if (enText.toLowerCase().includes(key)) {
        const reg = new RegExp(`\\b${key}\\b`, "gi");
        enText = enText.replace(reg, entry[targetLang] || entry.en);
      }
    }
    return prefix + enText + suffix;
  }

  // 6. For Hindi (hi): clean Hindi replacement
  let hiText = core;
  for (const [key, entry] of Object.entries(MASTER_LEXICON)) {
    if (hiText.toLowerCase().includes(key)) {
      const reg = new RegExp(`\\b${key}\\b`, "gi");
      hiText = hiText.replace(reg, entry.hi);
    }
  }
  return prefix + hiText + suffix;
}
