import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export const viewport: Viewport = {
  themeColor: "#008080",
};

export const metadata: Metadata = {
  title: "SichrPlace - Verified Student Apartments in Germany | Safe Apartment Search Platform",
  description:
    "Find safe, verified apartments for students and young professionals in Germany. Secure messaging, trusted landlords, and exclusive offers for AIESEC and university students.",
  keywords:
    "student apartments Germany, verified apartments, rent apartment Germany, student housing Berlin, landlord listing Germany, AIESEC housing, safe rental Germany, WG, student flat, young professionals, university housing",
  manifest: "/manifest.webmanifest",
  applicationName: "SichrPlace",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SichrPlace",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "SichrPlace - Verified Student Apartments in Germany",
    description:
      "Secure, transparent, and easy apartment search for students and professionals in Germany. Verified listings, secure messaging, and digital contracts.",
    url: "https://sichrplace.com/",
    type: "website",
    images: ["https://sichrplace.com/img/logo-shield.svg"],
  },
  robots: "index, follow",
  alternates: { canonical: "https://sichrplace.com/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Roboto:wght@300;400;500&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
        <link rel="icon" href="/img/favicon.ico" sizes="any" />
        <link rel="icon" href="/img/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
