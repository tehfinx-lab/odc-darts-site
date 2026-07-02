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
  themeColor: "#0A1710",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <PWARegister />
        <Analytics />
      </body>
    </html>
  );
}
