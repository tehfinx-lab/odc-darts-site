import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import PWARegister from "./PWARegister";

export const metadata = {
  title: "ODC | Online Darts Circuit",
  description: "Compete in one of the UK's most competitive online darts leagues. Real fixtures, live stats, weekly glory. Join today.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ODC",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "ODC | Online Darts Circuit",
    description: "Compete in one of the UK's most competitive online darts leagues. Join today.",
    url: "https://onlinedartscircuit.co.uk",
    siteName: "Online Darts Circuit",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ODC | Online Darts Circuit",
    description: "Compete in one of the UK's most competitive online darts leagues. Join today.",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  themeColor: "#16C46C",
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
