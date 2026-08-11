export const TITLE_OPTIONS = [
  { key: "adhyaksh", label: "अध्यक्ष (Adhyaksh)" },
  { key: "sachiv", label: "सचिव (Sachiv)" },
  { key: "kosadhyaksh", label: "कोषाध्यक्ष (Kosadhyaksh)" },
  { key: "sah_adhyaksh", label: "सह-अध्यक्ष" },
  { key: "prachar_mantri", label: "प्रचार मंत्री" },
  { key: "yuvat_pramukh", label: "युवा प्रमुख" },
  { key: "mahila_pramukh", label: "महिला प्रमुख" },
] as const;

export type TitleKey = (typeof TITLE_OPTIONS)[number]["key"];
