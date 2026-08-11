"use client";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shared/Logo";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();

  return (
    <div className="pb-8">
      <div className="relative h-44 bg-gradient-to-br from-matang-navy via-[#0d1f3c] to-black overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <Logo className="w-36 h-36" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-matang-navy via-transparent to-transparent" />
        <button onClick={() => router.back()} className="absolute top-3 left-3 p-2 rounded-full bg-black/40 text-white backdrop-blur z-10">
          <ArrowLeft size={18} />
        </button>
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <h1 className="text-2xl font-bold text-matang-gold">Matang Samaj</h1>
          <p className="text-white/70 text-sm">Our Roots · Our Identity · Our Future</p>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-2">
        <Card className="border-matang-gold/20">
          <CardContent className="p-4 space-y-3 text-sm text-gray-700 leading-relaxed">
            <div className="flex items-center gap-2 text-matang-navy font-bold">
              <BookOpen size={18} className="text-matang-gold" /> Origin & Identity
            </div>
            <p>
              The <strong>Matang</strong> community is an ancient and proud community with deep roots across
              Maharashtra, Chhattisgarh, Madhya Pradesh, and other regions of India. Historically associated with
              resilience, craftsmanship, and cultural richness, the community has preserved its traditions while
              contributing to the social fabric of the nation.
            </p>
            <p>
              The golden tree with the letter <strong>M</strong> represents our living heritage — roots in the past,
              branches reaching the future, and digital connections uniting every family.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3 text-sm text-gray-700 leading-relaxed">
            <p className="font-bold text-matang-navy">Values We Stand For</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Unity across cities and generations</li>
              <li>Education and skill development for youth</li>
              <li>Care for elders and mutual aid (Sahyog / Kosh)</li>
              <li>Dignity, verification, and transparent community governance</li>
              <li>Preservation of language, festivals, and family bonds</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3 text-sm text-gray-700 leading-relaxed">
            <p className="font-bold text-matang-navy">Matang Connect Mission</p>
            <p>
              Matang Connect is a digital ecosystem built by and for the community — to register every family,
              enable emergency SOS, share opportunities, and strengthen our collective voice. From Bilaspur pilot
              to every city, one verified digital identity connects us all.
            </p>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => router.push("/dashboard")}>Back to App</Button>
      </div>
    </div>
  );
}
