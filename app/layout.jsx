import "./globals.css";

export const metadata = {
  title: "ODC | Online Darts Circuit",
  description: "The home of competitive online darts.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
