/**
 * Verified Hindu festival dates (Delhi / India) from Drik Panchang.
 * Sources:
 * - https://www.drikpanchang.com/calendars/hindu/hinducalendar.html?year=YYYY&geoname-id=1273294
 * - Festival pages (Diwali, Dussehra, Maha Shivaratri) on drikpanchang.com
 *
 * No invented dates. Years without data return [] + UI links to Drik for that year.
 */

export type HinduEvent = {
  id: string;
  title: string;
  titleHi: string;
  date: string;
  tithi?: string;
  note?: string;
};

const Y2025: HinduEvent[] = [
  { id: "2025-makar", title: "Makara Sankranti / Pongal", titleHi: "मकर संक्रांति / पोंगल", date: "2025-01-14", tithi: "Dhanu → Makara" },
  { id: "2025-vasant", title: "Vasant Panchami", titleHi: "वसंत पंचमी", date: "2025-02-02", tithi: "Magha, Shukla Panchami" },
  { id: "2025-maha-shiv", title: "Maha Shivaratri", titleHi: "महाशिवरात्रि", date: "2025-02-26", tithi: "Phalguna, Krishna Chaturdashi" },
  { id: "2025-holika", title: "Holika Dahan", titleHi: "होलिका दहन", date: "2025-03-13", tithi: "Phalguna, Shukla Purnima" },
  { id: "2025-holi", title: "Holi", titleHi: "होली", date: "2025-03-14", tithi: "Chaitra, Krishna Pratipada" },
  { id: "2025-ugadi", title: "Ugadi / Gudi Padwa", titleHi: "उगादी / गुड़ी पड़वा", date: "2025-03-30", tithi: "Chaitra, Shukla Pratipada" },
  { id: "2025-ram", title: "Rama Navami", titleHi: "राम नवमी", date: "2025-04-06", tithi: "Chaitra, Shukla Navami" },
  { id: "2025-hanuman", title: "Hanuman Jayanti", titleHi: "हनुमान जयंती", date: "2025-04-12", tithi: "Chaitra, Shukla Purnima" },
  { id: "2025-akshaya", title: "Akshaya Tritiya", titleHi: "अक्षय तृतीया", date: "2025-04-30", tithi: "Vaishakha, Shukla Tritiya" },
  { id: "2025-buddha", title: "Buddha Purnima", titleHi: "बुद्ध पूर्णिमा", date: "2025-05-12", tithi: "Vaishakha, Shukla Purnima" },
  { id: "2025-ganga", title: "Ganga Dussehra", titleHi: "गंगा दशहरा", date: "2025-06-05", tithi: "Jyeshtha, Shukla Dashami" },
  { id: "2025-guru", title: "Guru Purnima", titleHi: "गुरु पूर्णिमा", date: "2025-07-10", tithi: "Ashadha, Shukla Purnima" },
  { id: "2025-rakhi", title: "Raksha Bandhan", titleHi: "रक्षाबंधन", date: "2025-08-09", tithi: "Shravana, Shukla Purnima" },
  { id: "2025-janmashtami", title: "Krishna Janmashtami", titleHi: "जन्माष्टमी", date: "2025-08-15", tithi: "Bhadrapada, Krishna Ashtami" },
  { id: "2025-ganesh", title: "Ganesh Chaturthi", titleHi: "गणेश चतुर्थी", date: "2025-08-27", tithi: "Bhadrapada, Shukla Chaturthi" },
  { id: "2025-visarjan", title: "Ganesh Visarjan / Anant Chaturdashi", titleHi: "गणेश विसर्जन", date: "2025-09-06", tithi: "Bhadrapada, Shukla Chaturdashi" },
  { id: "2025-navratri", title: "Navratri Begins", titleHi: "नवरात्रि आरंभ", date: "2025-09-22", tithi: "Ashwina, Shukla Pratipada" },
  { id: "2025-dussehra", title: "Dussehra / Vijayadashami", titleHi: "दशहरा", date: "2025-10-02", tithi: "Ashwina, Shukla Dashami" },
  { id: "2025-diwali", title: "Diwali / Lakshmi Puja", titleHi: "दीपावली", date: "2025-10-20", tithi: "Kartika, Krishna Amavasya" },
];

const Y2026: HinduEvent[] = [
  { id: "2026-makar", title: "Makara Sankranti / Pongal", titleHi: "मकर संक्रांति / पोंगल", date: "2026-01-14", tithi: "Dhanu → Makara" },
  { id: "2026-vasant", title: "Vasant Panchami", titleHi: "वसंत पंचमी", date: "2026-01-23", tithi: "Magha, Shukla Panchami" },
  { id: "2026-maha-shiv", title: "Maha Shivaratri", titleHi: "महाशिवरात्रि", date: "2026-02-15", tithi: "Phalguna, Krishna Chaturdashi" },
  { id: "2026-holika", title: "Holika Dahan", titleHi: "होलिका दहन", date: "2026-03-03", tithi: "Phalguna, Shukla Purnima" },
  { id: "2026-holi", title: "Holi", titleHi: "होली", date: "2026-03-04", tithi: "Chaitra, Krishna Pratipada" },
  { id: "2026-ugadi", title: "Ugadi / Gudi Padwa", titleHi: "उगादी / गुड़ी पड़वा", date: "2026-03-19", tithi: "Chaitra, Shukla Pratipada" },
  { id: "2026-ram", title: "Rama Navami (Smarta)", titleHi: "राम नवमी", date: "2026-03-26", tithi: "Chaitra, Shukla Navami" },
  { id: "2026-hanuman", title: "Hanuman Jayanti", titleHi: "हनुमान जयंती", date: "2026-04-02", tithi: "Chaitra, Shukla Purnima" },
  { id: "2026-akshaya", title: "Akshaya Tritiya", titleHi: "अक्षय तृतीया", date: "2026-04-19", tithi: "Vaishakha, Shukla Tritiya" },
  { id: "2026-buddha", title: "Buddha Purnima", titleHi: "बुद्ध पूर्णिमा", date: "2026-05-01", tithi: "Vaishakha, Shukla Purnima" },
  { id: "2026-ganga", title: "Ganga Dussehra", titleHi: "गंगा दशहरा", date: "2026-05-25", tithi: "Jyeshtha, Shukla Dashami" },
  { id: "2026-rath", title: "Jagannath Rath Yatra", titleHi: "रथ यात्रा", date: "2026-07-16", tithi: "Ashadha, Shukla Dwitiya" },
  { id: "2026-guru", title: "Guru Purnima", titleHi: "गुरु पूर्णिमा", date: "2026-07-29", tithi: "Ashadha, Shukla Purnima" },
  { id: "2026-rakhi", title: "Raksha Bandhan", titleHi: "रक्षाबंधन", date: "2026-08-28", tithi: "Shravana, Shukla Purnima" },
  { id: "2026-janmashtami", title: "Krishna Janmashtami", titleHi: "जन्माष्टमी", date: "2026-09-04", tithi: "Bhadrapada, Krishna Ashtami" },
  { id: "2026-ganesh", title: "Ganesh Chaturthi", titleHi: "गणेश चतुर्थी", date: "2026-09-14", tithi: "Bhadrapada, Shukla Chaturthi" },
  { id: "2026-visarjan", title: "Ganesh Visarjan", titleHi: "गणेश विसर्जन", date: "2026-09-25", tithi: "Bhadrapada, Shukla Chaturdashi" },
  { id: "2026-navratri", title: "Navratri Begins", titleHi: "नवरात्रि आरंभ", date: "2026-10-11", tithi: "Ashwina, Shukla Pratipada" },
  { id: "2026-dussehra", title: "Dussehra", titleHi: "दशहरा", date: "2026-10-20", tithi: "Ashwina, Shukla Dashami" },
  { id: "2026-diwali", title: "Diwali / Lakshmi Puja", titleHi: "दीपावली", date: "2026-11-08", tithi: "Kartika, Krishna Amavasya" },
  { id: "2026-chhath", title: "Chhath Puja", titleHi: "छठ पूजा", date: "2026-11-15", tithi: "Kartika, Shukla Shashthi" },
  { id: "2026-kartika-p", title: "Kartika Purnima", titleHi: "कार्तिक पूर्णिमा", date: "2026-11-24", tithi: "Kartika, Shukla Purnima" },
];

const Y2027: HinduEvent[] = [
  { id: "2027-makar", title: "Makara Sankranti / Pongal", titleHi: "मकर संक्रांति / पोंगल", date: "2027-01-15", tithi: "Dhanu → Makara" },
  { id: "2027-vasant", title: "Vasant Panchami", titleHi: "वसंत पंचमी", date: "2027-02-11", tithi: "Magha, Shukla Panchami" },
  { id: "2027-maha-shiv", title: "Maha Shivaratri", titleHi: "महाशिवरात्रि", date: "2027-03-06", tithi: "Phalguna, Krishna Chaturdashi" },
  { id: "2027-holika", title: "Holika Dahan", titleHi: "होलिका दहन", date: "2027-03-21", tithi: "Phalguna, Shukla Purnima" },
  { id: "2027-holi", title: "Holi", titleHi: "होली", date: "2027-03-22", tithi: "Chaitra, Krishna Pratipada" },
  { id: "2027-ugadi", title: "Ugadi / Gudi Padwa", titleHi: "उगादी / गुड़ी पड़वा", date: "2027-04-07", tithi: "Chaitra, Shukla Pratipada" },
  { id: "2027-ram", title: "Rama Navami", titleHi: "राम नवमी", date: "2027-04-15", tithi: "Chaitra, Shukla Navami" },
  { id: "2027-hanuman", title: "Hanuman Jayanti", titleHi: "हनुमान जयंती", date: "2027-04-20", tithi: "Chaitra, Shukla Purnima" },
  { id: "2027-akshaya", title: "Akshaya Tritiya", titleHi: "अक्षय तृतीया", date: "2027-05-09", tithi: "Vaishakha, Shukla Tritiya" },
  { id: "2027-buddha", title: "Buddha Purnima", titleHi: "बुद्ध पूर्णिमा", date: "2027-05-20", tithi: "Vaishakha, Shukla Purnima" },
  { id: "2027-rath", title: "Jagannath Rath Yatra", titleHi: "रथ यात्रा", date: "2027-07-05", tithi: "Ashadha, Shukla Dwitiya" },
  { id: "2027-guru", title: "Guru Purnima", titleHi: "गुरु पूर्णिमा", date: "2027-07-18", tithi: "Ashadha, Shukla Purnima" },
  { id: "2027-rakhi", title: "Raksha Bandhan", titleHi: "रक्षाबंधन", date: "2027-08-17", tithi: "Shravana, Shukla Purnima" },
  { id: "2027-janmashtami", title: "Krishna Janmashtami", titleHi: "जन्माष्टमी", date: "2027-08-25", tithi: "Bhadrapada, Krishna Ashtami" },
  { id: "2027-ganesh", title: "Ganesh Chaturthi", titleHi: "गणेश चतुर्थी", date: "2027-09-04", tithi: "Bhadrapada, Shukla Chaturthi" },
  { id: "2027-visarjan", title: "Ganesh Visarjan", titleHi: "गणेश विसर्जन", date: "2027-09-14", tithi: "Bhadrapada, Shukla Chaturdashi" },
  { id: "2027-navratri", title: "Navratri Begins", titleHi: "नवरात्रि आरंभ", date: "2027-09-30", tithi: "Ashwina, Shukla Pratipada" },
  { id: "2027-dussehra", title: "Dussehra", titleHi: "दशहरा", date: "2027-10-09", tithi: "Ashwina, Shukla Dashami" },
  { id: "2027-diwali", title: "Diwali / Lakshmi Puja", titleHi: "दीपावली", date: "2027-10-29", tithi: "Kartika, Krishna Amavasya" },
  { id: "2027-chhath", title: "Chhath Puja", titleHi: "छठ पूजा", date: "2027-11-04", tithi: "Kartika, Shukla Shashthi" },
];

const BY_YEAR: Record<number, HinduEvent[]> = {
  2025: Y2025,
  2026: Y2026,
  2027: Y2027,
};

export function festivalsForYear(year: number): HinduEvent[] {
  return BY_YEAR[year] || [];
}

export function hasVerifiedYear(year: number): boolean {
  return year in BY_YEAR;
}

/** Open official Drik calendar for any year (auto “sync” via source site) */
export function drikPanchangUrl(year: number): string {
  return `https://www.drikpanchang.com/calendars/hindu/hinducalendar.html?year=${year}&geoname-id=1273294`;
}

export const VERIFIED_YEARS = [2025, 2026, 2027] as const;
