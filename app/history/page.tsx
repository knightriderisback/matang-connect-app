"use client";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shared/Logo";
import { LanguageToggleLight } from "@/components/shared/LanguageToggleLight";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { ArrowLeft, BookOpen, Heart, Target } from "lucide-react";

const CONTENT: Record<
  string,
  {
    title: string;
    subtitle: string;
    originTitle: string;
    originP1: string;
    originP2: string;
    valuesTitle: string;
    values: string[];
    missionTitle: string;
    mission: string;
    back: string;
  }
> = {
  en: {
    title: "Matang Samaj",
    subtitle: "Our Roots · Our Identity · Our Future",
    originTitle: "Origin & Identity",
    originP1:
      "The Matang community is an ancient and proud community with deep roots across Maharashtra, Chhattisgarh, Madhya Pradesh, and other regions of India. Historically associated with resilience, craftsmanship, and cultural richness, the community has preserved its traditions while contributing to the social fabric of the nation.",
    originP2:
      "The golden tree with the letter M represents our living heritage — roots in the past, branches reaching the future, and digital connections uniting every family.",
    valuesTitle: "Values We Stand For",
    values: [
      "Unity across cities and generations",
      "Education and skill development for youth",
      "Care for elders and mutual aid (Sahyog / Kosh)",
      "Dignity, verification, and transparent community governance",
      "Preservation of language, festivals, and family bonds",
    ],
    missionTitle: "Matang Connect Mission",
    mission:
      "Matang Connect is a digital ecosystem built by and for the community — to register every family, enable emergency SOS, share opportunities, and strengthen our collective voice. From Bilaspur pilot to every city, one verified digital identity connects us all.",
    back: "Back to App",
  },
  hi: {
    title: "मातंग समाज",
    subtitle: "हमारी जड़ें · हमारी पहचान · हमारा भविष्य",
    originTitle: "उत्पत्ति और पहचान",
    originP1:
      "मातंग समुदाय एक प्राचीन और गौरवशाली समुदाय है जिसकी गहरी जड़ें महाराष्ट्र, छत्तीसगढ़, मध्य प्रदेश और भारत के अन्य क्षेत्रों में हैं। ऐतिहासिक रूप से लचीलापन, शिल्प और सांस्कृतिक समृद्धि से जुड़ा यह समुदाय अपनी परंपराओं को संजोए हुए राष्ट्र की सामाजिक संरचना में योगदान देता आया है।",
    originP2:
      "अक्षर M वाला सुनहरा वृक्ष हमारी जीवंत विरासत का प्रतीक है — अतीत में जड़ें, भविष्य की ओर शाखाएँ, और हर परिवार को जोड़ती डिजिटल कड़ियाँ।",
    valuesTitle: "हमारे मूल्य",
    values: [
      "शहरों और पीढ़ियों में एकता",
      "युवाओं के लिए शिक्षा और कौशल",
      "वृद्धों की सेवा और पारस्परिक सहयोग (सहयोग / कोष)",
      "गरिमा, सत्यापन और पारदर्शी शासन",
      "भाषा, त्योहार और पारिवारिक बंधन",
    ],
    missionTitle: "मतंग कनेक्ट मिशन",
    mission:
      "मतंग कनेक्ट समुदाय द्वारा और समुदाय के लिए बना डिजिटल इकोसिस्टम है — हर परिवार का पंजीकरण, आपातकालीन SOS, अवसर साझा करना और सामूहिक आवाज़ मजबूत करना। बिलासपुर पायलट से हर शहर तक, एक सत्यापित डिजिटल पहचान हमें जोड़ती है।",
    back: "ऐप पर वापस",
  },
  mr: {
    title: "मातंग समाज",
    subtitle: "आपली मुळे · आपली ओळख · आपले भविष्य",
    originTitle: "उत्पत्ती आणि ओळख",
    originP1:
      "मातंग समुदाय हा महाराष्ट्र, छत्तीसगड, मध्य प्रदेश आणि भारतातील इतर प्रदेशांत खोल मुळे असलेला प्राचीन आणि अभिमानास्पद समुदाय आहे.",
    originP2:
      "M अक्षराचे सोनेरी वृक्ष आमच्या वारशाचे प्रतीक आहे — भूतकाळातील मुळे, भविष्यातील फांद्या आणि प्रत्येक कुटुंब जोडणारे डिजिटल दुवे.",
    valuesTitle: "आमची मूल्ये",
    values: [
      "शहरे व पिढ्यांमध्ये एकता",
      "युवकांसाठी शिक्षण आणि कौशल्य",
      "वृद्धसेवा आणि परस्पर सहाय्य",
      "गौरव, पडताळणी आणि पारदर्शक शासन",
      "भाषा, सण आणि कौटुंबिक बंध",
    ],
    missionTitle: "मतंग कनेक्ट मिशन",
    mission:
      "मतंग कनेक्ट हे समुदायासाठी डिजिटल परिसंस्था आहे — कुटुंब नोंदणी, SOS, संधी आणि एकत्रित आवाज.",
    back: "अॅपवर परत",
  },
  cg: {
    title: "मातंग समाज",
    subtitle: "हमर जउरी · हमर पहिचान · हमर भविष्य",
    originTitle: "उत्पत्ति अउ पहिचान",
    originP1:
      "मातंग समुदाय छत्तीसगढ़, महाराष्ट्र अउ भारत के अउ इलाका मं गहिर जउरी वाले प्राचीन अउ गौरव के समुदाय हे।",
    originP2:
      "M अक्षर वाला सुनछला रुख हमर विरासत के निशानी हे — जउरी, डार अउ डिजिटल जुड़ाव।",
    valuesTitle: "हमर मूल्य",
    values: [
      "एकता",
      "शिक्षा अउ कौशल",
      "बुजुर्ग सेवा अउ सहयोग",
      "गरिमा अउ सत्यापन",
      "भाषा अउ त्यौहार",
    ],
    missionTitle: "मतंग कनेक्ट मिशन",
    mission:
      "मतंग कनेक्ट समुदाय बर डिजिटल इकोसिस्टम हे — परिवार पंजीयन, SOS, अवसर अउ सामूहिक आवाज।",
    back: "ऐप वापस",
  },
};

export default function HistoryPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const c = CONTENT[lang] || CONTENT.en;

  return (
    <div className="min-h-full bg-matang-cream pb-8">
      {/* ===== BANNER ===== */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#050d18] via-[#0a1628] to-[#132a4a]">
        {/* soft gold glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-matang-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />

        {/* top bar */}
        <div className="relative z-10 flex items-center justify-between px-3 pt-3 md:px-8 md:pt-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm ring-1 ring-white/15 active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <LanguageToggleLight />
        </div>

        {/* logo + title block — clean vertical stack */}
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 pb-8 pt-4 text-center md:pb-12 md:pt-6">
          <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-matang-navy shadow-xl ring-2 ring-matang-gold/50 md:mb-5 md:h-32 md:w-32 md:rounded-3xl">
            <Logo className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-matang-gold md:text-4xl">
            {c.title}
          </h1>
          <p className="mt-1.5 max-w-md text-xs text-white/65 md:text-sm">
            {c.subtitle}
          </p>
          <div className="mt-4 h-0.5 w-16 rounded-full bg-gradient-to-r from-transparent via-matang-gold to-transparent md:w-24" />
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 md:grid md:max-w-5xl md:grid-cols-2 md:gap-5 md:space-y-0 md:px-8 md:py-8">
        <Card className="border-matang-gold/25 shadow-sm md:col-span-2">
          <CardContent className="space-y-3 p-4 text-sm leading-relaxed text-gray-700 md:p-6 md:text-[15px]">
            <div className="flex items-center gap-2 font-bold text-matang-navy">
              <BookOpen size={18} className="shrink-0 text-matang-gold" />
              {c.originTitle}
            </div>
            <p>{c.originP1}</p>
            <p className="text-gray-600">{c.originP2}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="space-y-3 p-4 text-sm leading-relaxed text-gray-700 md:p-5">
            <p className="flex items-center gap-2 font-bold text-matang-navy">
              <Heart size={16} className="shrink-0 text-matang-gold" />
              {c.valuesTitle}
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              {c.values.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="space-y-3 p-4 text-sm leading-relaxed text-gray-700 md:p-5">
            <p className="flex items-center gap-2 font-bold text-matang-navy">
              <Target size={16} className="shrink-0 text-matang-gold" />
              {c.missionTitle}
            </p>
            <p>{c.mission}</p>
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Button className="w-full md:mx-auto md:block md:max-w-sm" onClick={() => router.push("/dashboard")}>
            {c.back}
          </Button>
        </div>
      </div>
    </div>
  );
}
