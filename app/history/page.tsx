"use client";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shared/Logo";
import { LanguageToggleLight } from "@/components/shared/LanguageToggleLight";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { ArrowLeft, BookOpen, Heart, Target } from "lucide-react";

const CONTENT: Record<string, {
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
}> = {
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
      "अक्षर M वाला सुनहरा वृक्ष हमारी जीवंत विरासत का प्रतीक है — अतीत में जड़ें, भविष्य तक शाखाएँ, और हर परिवार को जोड़ने वाले डिजिटल संबंध।",
    valuesTitle: "हमारे मूल्य",
    values: [
      "शहरों और पीढ़ियों में एकता",
      "युवाओं के लिए शिक्षा और कौशल विकास",
      "बुजुर्गों की देखभाल और परस्पर सहायता (सहयोग / कोष)",
      "गरिमा, सत्यापन और पारदर्शी सामुदायिक शासन",
      "भाषा, त्योहारों और पारिवारिक बंधनों का संरक्षण",
    ],
    missionTitle: "मातंग कनेक्ट मिशन",
    mission:
      "मातंग कनेक्ट समुदाय द्वारा और समुदाय के लिए बना डिजिटल पारिस्थितिकी तंत्र है — हर परिवार का पंजीकरण, आपातकालीन एसओएस, अवसर साझा करना और सामूहिक आवाज़ मजबूत करना। बिलासपुर पायलट से हर शहर तक, एक सत्यापित डिजिटल पहचान हमें जोड़ती है।",
    back: "ऐप पर वापस",
  },
  mr: {
    title: "मातंग समाज",
    subtitle: "आपली मुळे · आपली ओळख · आपले भविष्य",
    originTitle: "उत्पत्ती आणि ओळख",
    originP1:
      "मातंग समुदाय हा महाराष्ट्र, छत्तीसगड, मध्य प्रदेश आणि भारताच्या इतर भागांत खोल मुळे असलेला प्राचीन आणि अभिमानास्पद समुदाय आहे. ऐतिहासिकदृष्ट्या लवचिकता, कौशल्य आणि सांस्कृतिक समृद्धीशी संबंधित हा समुदाय आपल्या परंपरा जपत राष्ट्राला योगदान देत आला आहे.",
    originP2:
      "अक्षर M असलेले सोनेरी झाड आपल्या जिवंत वारशाचे प्रतीक आहे — भूतकाळात मुळे, भविष्यकाळापर्यंत फांद्या आणि प्रत्येक कुटुंबाला जोडणारे डिजिटल संबंध.",
    valuesTitle: "आमची मूल्ये",
    values: [
      "शहरे आणि पिढ्यांमधील एकता",
      "युवांसाठी शिक्षण आणि कौशल्य विकास",
      "वृद्धांची काळजी आणि परस्पर सहाय्य (सहयोग / कोष)",
      "मान, पडताळणी आणि पारदर्शक सामुदायिक शासन",
      "भाषा, सण आणि कौटुंबिक बंधांचे जतन",
    ],
    missionTitle: "मातंग कनेक्ट मिशन",
    mission:
      "मातंग कनेक्ट हे समुदायासाठी आणि समुदायाद्वारे तयार केलेले डिजिटल परिसंस्था आहे — प्रत्येक कुटुंबाची नोंदणी, आपत्कालीन एसओएस, संधी शेअर करणे आणि सामूहिक आवाज बळकट करणे. बिलासपूर पायलटपासून प्रत्येक शहरापर्यंत एक पडताळलेली डिजिटल ओळख आम्हाला जोडते.",
    back: "अॅपवर परत",
  },
  cg: {
    title: "मातंग समाज",
    subtitle: "हमर जड़ · हमर पहिचान · हमर भविष्य",
    originTitle: "उत्पत्ति अउ पहिचान",
    originP1:
      "मातंग समुदाय एक प्राचीन अउ गौरवशाली समुदाय हे जेकर गहरी जड़ महाराष्ट्र, छत्तीसगढ़, मध्य प्रदेश अउ भारत के अउ इलाका मं हे। ऐतिहासिक रूप ले लचीलापन, शिल्प अउ सांस्कृतिक समृद्धि ले जुड़ाय ये समुदाय अपन परंपरा ल संजोए रहि के राष्ट्र मं योगदान देवत हे।",
    originP2:
      "अक्षर M वाला सुनहरा पेड़ हमर जीवंत विरासत के प्रतीक हे — अतीत मं जड़, भविष्य तक डार, अउ हर परिवार ल जोड़इया डिजिटल संबंध।",
    valuesTitle: "हमर मूल्य",
    values: [
      "शहर अउ पीढ़ी मं एकता",
      "जवान मन बर शिक्षा अउ कौशल विकास",
      "बुजुर्ग मन के देखभाल अउ परस्पर मदद (सहयोग / कोष)",
      "गरिमा, सत्यापन अउ पारदर्शी सामुदायिक शासन",
      "भाखा, त्योहार अउ पारिवारिक बंधन के संरक्षण",
    ],
    missionTitle: "मातंग कनेक्ट मिशन",
    mission:
      "मातंग कनेक्ट समुदाय द्वारा अउ समुदाय बर बना डिजिटल तंत्र हे — हर परिवार के पंजीकरण, आपातकालीन एसओएस, अवसर बाँटना अउ सामूहिक आवाज मजबूत करना। बिलासपुर पायलट ले हर शहर तक, एक सत्यापित डिजिटल पहिचान हमन ल जोड़थे।",
    back: "ऐप मं वापस",
  },
};

export default function HistoryPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const c = CONTENT[lang] || CONTENT.en;

  return (
    <div className="pb-8">
      {/* Cover — logo arranged cleanly */}
      <div className="relative h-52 md:h-64 bg-gradient-to-br from-matang-navy via-[#0d1f3c] to-black overflow-hidden">
        <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(circle_at_30%_40%,#c9a227_0%,transparent_50%)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl overflow-hidden ring-2 ring-matang-gold/40 shadow-2xl bg-matang-navy/80">
            <Logo className="w-full h-full" />
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-matang-navy via-matang-navy/40 to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-black/40 text-white backdrop-blur"
          >
            <ArrowLeft size={18} />
          </button>
          <LanguageToggleLight />
        </div>
        <div className="absolute bottom-4 left-4 right-4 z-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-matang-gold">{c.title}</h1>
          <p className="text-white/70 text-sm mt-0.5">{c.subtitle}</p>
        </div>
      </div>

      <div className="p-4 md:px-8 space-y-4 -mt-1 max-w-3xl mx-auto">
        <Card className="border-matang-gold/20">
          <CardContent className="p-4 space-y-3 text-sm text-gray-700 leading-relaxed">
            <div className="flex items-center gap-2 text-matang-navy font-bold">
              <BookOpen size={18} className="text-matang-gold" /> {c.originTitle}
            </div>
            <p>{c.originP1}</p>
            <p>{c.originP2}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3 text-sm text-gray-700 leading-relaxed">
            <p className="font-bold text-matang-navy flex items-center gap-2">
              <Heart size={16} className="text-matang-gold" /> {c.valuesTitle}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {c.values.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3 text-sm text-gray-700 leading-relaxed">
            <p className="font-bold text-matang-navy flex items-center gap-2">
              <Target size={16} className="text-matang-gold" /> {c.missionTitle}
            </p>
            <p>{c.mission}</p>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => router.push("/dashboard")}>
          {c.back}
        </Button>
      </div>
    </div>
  );
}
