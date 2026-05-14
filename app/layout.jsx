import "./globals.css";
import { Analytics } from '@vercel/analytics/next';

export const metadata = { title: "ODC | Online Darts Circuit", description: "The home of competitive online darts." };
export default function RootLayout({ children }) { return <html lang="en"><body>{children}<Analytics /></body></html>; }
