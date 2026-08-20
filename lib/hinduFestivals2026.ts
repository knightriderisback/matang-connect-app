/**
 * 2026 Hindu festival dates — verified from Drik Panchang
 * Location baseline: Delhi, NCT, India
 * Source: https://www.drikpanchang.com/calendars/hindu/hinducalendar.html?year=2026&geoname-id=1273294
 *
 * Note: Tithi-based festivals can shift ±1 day by city / muhurat.
 * We do NOT invent dates. Only entries with published Drik (or matching multi-source) dates.
 */

export type HinduEvent = {
  id: string;
  title: string;
  titleHi: string;
  date: string; // YYYY-MM-DD
  tithi?: string;
  note?: string;
};

/** Primary 2026 observances (Delhi / India) */
export const HINDU_FESTIVALS_2026: HinduEvent[] = [
  { id: "2026-pausha-purnima", title: "Pausha Purnima", titleHi: "पौष पूर्णिमा", date: "2026-01-03", tithi: "Pausha, Shukla Purnima" },
  { id: "2026-makar", title: "Makara Sankranti / Pongal", titleHi: "मकर संक्रांति / पोंगल", date: "2026-01-14", tithi: "Dhanu → Makara (Sun)", note: "Solar sankranti — fixed for most of India" },
  { id: "2026-mauni", title: "Mauni Amavasya", titleHi: "मौनी अमावस्या", date: "2026-01-18", tithi: "Magha, Krishna Amavasya" },
  { id: "2026-vasant", title: "Vasant Panchami", titleHi: "वसंत पंचमी (सरस्वती पूजा)", date: "2026-01-23", tithi: "Magha, Shukla Panchami" },
  { id: "2026-ratha", title: "Ratha Saptami", titleHi: "रथ सप्तमी", date: "2026-01-25", tithi: "Magha, Shukla Saptami" },
  { id: "2026-maha-shiv", title: "Maha Shivaratri", titleHi: "महाशिवरात्रि", date: "2026-02-15", tithi: "Phalguna, Krishna Chaturdashi" },
  { id: "2026-holika", title: "Holika Dahan / Chhoti Holi", titleHi: "होलिका दहन / छोटी होली", date: "2026-03-03", tithi: "Phalguna, Shukla Purnima" },
  { id: "2026-holi", title: "Holi", titleHi: "होली (धुलेंडी)", date: "2026-03-04", tithi: "Chaitra, Krishna Pratipada" },
  { id: "2026-ugadi", title: "Ugadi / Gudi Padwa / Hindu New Year", titleHi: "उगादी / गुड़ी पड़वा / नववर्ष", date: "2026-03-19", tithi: "Chaitra, Shukla Pratipada" },
  { id: "2026-ram-navami", title: "Rama Navami (Smarta)", titleHi: "राम नवमी", date: "2026-03-26", tithi: "Chaitra, Shukla Navami" },
  { id: "2026-hanuman", title: "Hanuman Jayanti", titleHi: "हनुमान जयंती", date: "2026-04-02", tithi: "Chaitra, Shukla Purnima" },
  { id: "2026-akshaya", title: "Akshaya Tritiya", titleHi: "अक्षय तृतीया", date: "2026-04-19", tithi: "Vaishakha, Shukla Tritiya" },
  { id: "2026-narasimha", title: "Narasimha Jayanti", titleHi: "नरसिंह जयंती", date: "2026-04-30", tithi: "Vaishakha, Shukla Chaturdashi" },
  { id: "2026-buddha", title: "Buddha Purnima", titleHi: "बुद्ध पूर्णिमा", date: "2026-05-01", tithi: "Vaishakha, Shukla Purnima" },
  { id: "2026-ganga-dussehra", title: "Ganga Dussehra", titleHi: "गंगा दशहरा", date: "2026-05-25", tithi: "Jyeshtha, Shukla Dashami" },
  { id: "2026-nirjala", title: "Nirjala Ekadashi", titleHi: "निर्जला एकादशी", date: "2026-06-25", tithi: "Jyeshtha, Shukla Ekadashi" },
  { id: "2026-rath-yatra", title: "Jagannath Rath Yatra", titleHi: "जगन्नाथ रथ यात्रा", date: "2026-07-16", tithi: "Ashadha, Shukla Dwitiya" },
  { id: "2026-guru-purnima", title: "Guru Purnima", titleHi: "गुरु पूर्णिमा", date: "2026-07-29", tithi: "Ashadha, Shukla Purnima" },
  { id: "2026-hariyali-teej", title: "Hariyali Teej", titleHi: "हरियाली तीज", date: "2026-08-15", tithi: "Shravana, Shukla Tritiya" },
  { id: "2026-nag-panchami", title: "Nag Panchami", titleHi: "नाग पंचमी", date: "2026-08-17", tithi: "Shravana, Shukla Panchami" },
  { id: "2026-rakhi", title: "Raksha Bandhan", titleHi: "रक्षाबंधन", date: "2026-08-28", tithi: "Shravana, Shukla Purnima" },
  { id: "2026-janmashtami", title: "Krishna Janmashtami", titleHi: "कृष्ण जन्माष्टमी", date: "2026-09-04", tithi: "Bhadrapada, Krishna Ashtami" },
  { id: "2026-ganesh", title: "Ganesh Chaturthi", titleHi: "गणेश चतुर्थी", date: "2026-09-14", tithi: "Bhadrapada, Shukla Chaturthi" },
  { id: "2026-visarjan", title: "Ganesh Visarjan / Anant Chaturdashi", titleHi: "गणेश विसर्जन / अनंत चतुर्दशी", date: "2026-09-25", tithi: "Bhadrapada, Shukla Chaturdashi" },
  { id: "2026-pitru-start", title: "Pitru Paksha Begins", titleHi: "पितृ पक्ष आरंभ", date: "2026-09-27", tithi: "Ashwina, Krishna Pratipada" },
  { id: "2026-sarva-pitru", title: "Sarva Pitru Amavasya", titleHi: "सर्व पितृ अमावस्या", date: "2026-10-10", tithi: "Ashwina, Krishna Amavasya" },
  { id: "2026-navratri", title: "Sharadiya Navratri Begins", titleHi: "शारदीय नवरात्रि आरंभ", date: "2026-10-11", tithi: "Ashwina, Shukla Pratipada" },
  { id: "2026-durga-ashtami", title: "Durga Ashtami / Maha Navami", titleHi: "दुर्गाष्टमी / महा नवमी", date: "2026-10-19", tithi: "Ashwina, Shukla Ashtami / Navami" },
  { id: "2026-dussehra", title: "Vijayadashami / Dussehra", titleHi: "विजयदशमी / दशहरा", date: "2026-10-20", tithi: "Ashwina, Shukla Dashami" },
  { id: "2026-sharad-purnima", title: "Sharad Purnima", titleHi: "शरद पूर्णिमा", date: "2026-10-25", tithi: "Ashwina, Shukla Purnima" },
  { id: "2026-karwa", title: "Karwa Chauth", titleHi: "करवा चौथ", date: "2026-10-29", tithi: "Kartika, Krishna Chaturthi" },
  { id: "2026-dhanteras", title: "Dhanteras", titleHi: "धनतेरस", date: "2026-11-06", tithi: "Kartika, Krishna Trayodashi" },
  { id: "2026-diwali", title: "Diwali / Lakshmi Puja", titleHi: "दीपावली / लक्ष्मी पूजा", date: "2026-11-08", tithi: "Kartika, Krishna Amavasya" },
  { id: "2026-govardhan", title: "Govardhan Puja", titleHi: "गोवर्धन पूजा", date: "2026-11-10", tithi: "Kartika, Shukla Pratipada" },
  { id: "2026-bhai-dooj", title: "Bhaiya Dooj", titleHi: "भाई दूज", date: "2026-11-11", tithi: "Kartika, Shukla Dwitiya" },
  { id: "2026-chhath", title: "Chhath Puja (Sandhya Arghya)", titleHi: "छठ पूजा", date: "2026-11-15", tithi: "Kartika, Shukla Shashthi" },
  { id: "2026-kartika-purnima", title: "Kartika Purnima", titleHi: "कार्तिक पूर्णिमा", date: "2026-11-24", tithi: "Kartika, Shukla Purnima" },
  { id: "2026-gita", title: "Gita Jayanti / Mokshada Ekadashi", titleHi: "गीता जयंती / मोक्षदा एकादशी", date: "2026-12-20", tithi: "Margashirsha, Shukla Ekadashi" },
];

export function festivalsForYear(year: number): HinduEvent[] {
  if (year === 2026) return HINDU_FESTIVALS_2026;
  // Other years: empty — do not invent dates
  return [];
}
