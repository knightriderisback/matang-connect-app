import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { ToastProvider } from "@/components/ui/Toaster";
import { BottomNav } from "@/components/shared/BottomNav";

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
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-matang-cream antialiased">
        <LanguageProvider>
          <ToastProvider>
            <div className="min-h-screen flex justify-center bg-gray-100 md:bg-gray-200">
              <div className="w-full max-w-lg min-h-screen bg-matang-cream shadow-xl md:shadow-2xl relative">
                <main className="pb-20">{children}</main>
                <BottomNav />
              </div>
            </div>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
