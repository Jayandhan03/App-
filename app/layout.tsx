import "./globals.css";
import type { Metadata, Viewport } from "next";
import SessionProvider from "@/components/SessionProvider";
import PushNotificationBridge from "@/components/PushNotificationBridge";

export const metadata: Metadata = {
  title: "Leora — Personal AI agents that brief you by voice",
  description:
    "Deploy AI agents that monitor the topics you care about and send you voice-note updates — in your language, voice and cadence — inside the Leora app, Telegram or WhatsApp. Built for busy people who need to stay ahead without reading a thing.",
  keywords: ["AI agents", "voice briefings", "personal assistant", "news monitoring", "Telegram bot"],
  openGraph: {
    title: "Leora — Personal AI agents that brief you by voice",
    description:
      "Your intelligent workforce: agents that read the web for you and deliver concise voice-note briefings, wherever you are.",
    siteName: "Leora",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Leora — Personal AI agents that brief you by voice",
    description: "Agents that read the web for you and brief you by voice. Listen, don't scroll.",
  },
  icons: {
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#090B0F" },
  ],
};

/* Set the theme before first paint to avoid a flash of the wrong theme. */
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('leora-theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;450;500;550;600;700;800&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider>
          <PushNotificationBridge />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
