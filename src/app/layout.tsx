import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-renewly-display",
  subsets: ["latin"],
});

const sans = Source_Sans_3({
  variable: "--font-renewly-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Renewly — renew before it lapses",
  description:
    "Track road tax, licence, passport, insurance, and subscription renewals with smart lead-time nudges.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
