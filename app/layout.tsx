import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { ToastProvider } from "@/components/ui/Toaster";
import { BottomNav } from "@/components/shared/BottomNav";

export const metadata: Metadata = {
  title: "Matang Connect",
  description: "Digital ecosystem for the Matang community",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-matang-cream">
        <LanguageProvider>
          <ToastProvider>
            <main className="pb-20 max-w-lg mx-auto">{children}</main>
            <BottomNav />
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
