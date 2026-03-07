import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instant Audio News - Your Daily News, Delivered as Audio",
  description:
    "Get personalized news briefings sent directly to you — WhatsApp or Telegram. AI-powered audio news delivered instantly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0d0d14] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
