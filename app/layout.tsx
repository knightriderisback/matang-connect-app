import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { ToastProvider } from "@/components/ui/Toaster";
import { BottomNav } from "@/components/shared/BottomNav";
import { AppHeader } from "@/components/shared/AppHeader";
import { FloatingLogo } from "@/components/shared/FloatingLogo";
import { MatangAI } from "@/components/shared/MatangAI";

export const metadata: Metadata = {
  title: "Matang Connect",
  description: "Digital ecosystem for the Matang community",
  manifest: "/manifest.json",
  icons: { icon: "/icon-192x192.png", apple: "/icon-192x192.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Matang Connect" },
};

export const viewport: Viewport = {
  themeColor: "#0a1628",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-matang-cream antialiased">
        <LanguageProvider>
          <ToastProvider>
            {/* Outer shell: phone on mobile, wide desktop panel */}
            <div className="min-h-[100dvh] flex justify-center bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 md:from-slate-200 md:via-slate-100 md:to-slate-200">
              <div className="w-full max-w-lg md:max-w-5xl lg:max-w-6xl min-h-[100dvh] md:min-h-[100dvh] flex flex-col bg-matang-cream shadow-xl md:shadow-2xl md:my-0 md:border-x md:border-gray-200 relative">
                <AppHeader />
                {/* Scroll only the main content — footer stays fixed at bottom */}
                <main
                  data-scroll-root
                  className="flex-1 overflow-y-auto overscroll-contain pb-20 md:pb-6 min-h-0"
                >
                  <div className="md:grid md:grid-cols-12 md:gap-6 md:px-6 md:py-4">
                    <div className="md:col-span-12 lg:col-span-12">{children}</div>
                  </div>
                </main>
                <BottomNav />
                <FloatingLogo />
                <MatangAI />
              </div>
            </div>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
