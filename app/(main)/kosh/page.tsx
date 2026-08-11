"use client";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { Construction } from "lucide-react";

export default function KoshPage() {
  const router = useRouter();
  return (
    <div className="p-4 min-h-[60vh] flex flex-col items-center justify-center">
      <Card className="w-full max-w-sm border-matang-gold/30">
        <CardContent className="p-6 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-matang-gold/15 flex items-center justify-center">
            <Construction className="text-matang-gold" size={28} />
          </div>
          <h1 className="text-lg font-bold text-matang-navy">Sahyog Kosh</h1>
          <p className="text-sm text-gray-500">
            This module is part of <strong>Stage 2</strong> and will be enabled after Stage 1 is fully live across cities.
          </p>
          <p className="text-xs text-gray-400">Design is ready — implementation starts when you give the go-ahead.</p>
          <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
