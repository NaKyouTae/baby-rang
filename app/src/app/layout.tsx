import type { Metadata, Viewport } from "next";
import "./globals.css";
import SplashProvider from "@/components/SplashProvider";
import LoginPromptProvider from "@/components/LoginPromptProvider";
import AdSenseScript from "@/components/ads/AdSenseScript";

export const metadata: Metadata = {
  title: "아기랑",
  description: "우리 아기의 모든 순간",
  manifest: "/manifest.json",
  verification: {
    google: "7Z5qXHvXmaZVGUrCaUMCuRR5uMGbTCBwG8-fSJMouLE",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "아기랑",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex justify-center bg-white">
        <div className="relative w-full max-w-[430px] h-dvh overflow-y-auto">
          <SplashProvider>
            <LoginPromptProvider>{children}</LoginPromptProvider>
          </SplashProvider>
          <AdSenseScript />
        </div>
      </body>
    </html>
  );
}
