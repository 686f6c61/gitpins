/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Root Layout
 * Next.js root layout component that wraps all pages.
 * Provides theme and i18n providers, sets up fonts and metadata.
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitPins - Order your GitHub repositories",
  description: "Take control of your GitHub profile. Pin and order your repositories the way you want. Keep your best projects always visible.",
  keywords: ["github", "repos", "portfolio", "developer", "order", "pin", "profile", "repositories", "open source"],
  authors: [{ name: "686f6c61", url: "https://github.com/686f6c61" }],
  creator: "686f6c61",
  publisher: "GitPins",
  applicationName: "GitPins",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "GitPins - Order your GitHub repositories",
    description: "Take control of your GitHub profile. Pin and order your repositories the way you want.",
    url: "https://gitpins.vercel.app",
    siteName: "GitPins",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GitPins - Order your GitHub repositories",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitPins - Order your GitHub repositories",
    description: "Take control of your GitHub profile. Pin and order your repositories the way you want.",
    images: ["/og-image.png"],
    creator: "@686f6c61",
  },
  metadataBase: new URL("https://gitpins.vercel.app"),
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "es-ES": "/",
    },
  },
  category: "technology",
  other: {
    "version": "1.0.0",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
