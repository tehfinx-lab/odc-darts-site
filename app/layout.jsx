import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import PWARegister from "./PWARegister";

export const metadata = {
  title: "ODC | Online Darts Circuit",
  description: "The home of competitive online darts.",
  manifest: "/manifest.json",
  themeColor: "#e51d2a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ODC",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#e51d2a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PWARegister />
        <Analytics />
      </body>
    </html>
  );
}
