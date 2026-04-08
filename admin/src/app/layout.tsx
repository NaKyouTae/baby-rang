import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "아기랑 어드민",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
