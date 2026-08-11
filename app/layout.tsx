import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { ToastProvider } from "@/components/ui/Toaster";
import { BottomNav } from "@/components/shared/BottomNav";
import { AppHeader } from "@/components/shared/AppHeader";
import { FloatingLogo } from "@/components/shared/FloatingLogo";

export const metadata: Metadata = {
  title: "Matang Connect",
  description: "Digital ecosystem for the Matang community",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: "/logo.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Matang Connect",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1628",
  width: "device-width",
  initialScale: 1,
  // Allow pinch-zoom for accessibility (was maximumScale: 1 / userScalable: false)
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-matang-cream antialiased">
        <LanguageProvider>
          <ToastProvider>
            <div className="min-h-screen flex justify-center bg-gray-100 md:bg-gray-200">
              <div
                data-scroll-root
                className="w-full max-w-lg h-[100dvh] overflow-y-auto bg-matang-cream shadow-xl md:shadow-2xl relative"
              >
                <AppHeader />
                <main className="pb-4 min-h-[calc(100dvh-8rem)]">{children}</main>
                <BottomNav />
                <FloatingLogo />
              </div>
            </div>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
