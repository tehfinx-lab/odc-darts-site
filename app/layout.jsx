import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import PWARegister from "./PWARegister";

export const metadata = {
  title: "ODC | Online Darts Circuit",
  description: "The home of competitive online darts.",
};

export const viewport = {
  themeColor: "#e51d2a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* PWA: explicit tags so Chrome reliably detects an installable app */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e51d2a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ODC" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      </head>
      <body>
        {children}
        <PWARegister />
        <Analytics />
      </body>
    </html>
  );
}
