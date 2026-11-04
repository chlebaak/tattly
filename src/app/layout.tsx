import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { appUrl } from "@/lib/env";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "Tattly.eu – rezervace se screeningem a zálohou",
    template: "%s | Tattly.eu",
  },
  description:
    "Rezervační systém pro tatéry, fyzioterapeuty a trenéry: screening poptávek, zálohy QR platbou a synchronizace s Google Kalendářem.",
  openGraph: {
    type: "website",
    siteName: "Tattly.eu",
    locale: "cs_CZ",
    url: "/",
    title: "Tattly.eu – rezervace se screeningem a zálohou",
    description:
      "Poptávky se screeningem, zálohy QR platbou a kalendář, který se sám hlídá.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tattly.eu – rezervace se screeningem a zálohou",
    description:
      "Poptávky se screeningem, zálohy QR platbou a kalendář, který se sám hlídá.",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f5f1",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={geist.variable}>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
