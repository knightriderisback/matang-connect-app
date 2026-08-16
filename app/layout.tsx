import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { ToastProvider } from "@/components/ui/Toaster";
import { BottomNav } from "@/components/shared/BottomNav";
import { FloatingLogo } from "@/components/shared/FloatingLogo";
import { AppHeader } from "@/components/shared/AppHeader";
import { MatangAI } from "@/components/shared/MatangAI";
import { PWARegister } from "@/components/shared/PWARegister";
import { InstallPrompt } from "@/components/shared/InstallPrompt";

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
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full overflow-hidden bg-matang-navy antialiased">
        <LanguageProvider>
          <ToastProvider>
            {/* Fixed viewport height so main scrolls and footer stays visible */}
            <div className="h-[100dvh] h-[100vh] flex justify-center bg-matang-navy md:bg-gradient-to-br md:from-slate-200 md:via-slate-100 md:to-slate-200">
              <div className="w-full max-w-lg md:max-w-5xl lg:max-w-6xl h-full flex flex-col bg-matang-navy md:bg-matang-cream shadow-xl md:shadow-2xl md:border-x md:border-gray-200 relative overflow-hidden">
                <AppHeader />
                <main
                  data-scroll-root
                  className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pb-28 bg-matang-cream"
                >
                  <div className="md:px-6 md:py-4">{children}</div>
                </main>
                <FloatingLogo />
                <BottomNav />
                <MatangAI />
                <PWARegister />
                <InstallPrompt />
              </div>
            </div>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
