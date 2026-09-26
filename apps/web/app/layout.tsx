import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import "@karakeep/tailwind-config/globals.css";

import type { Viewport } from "next";
import React from "react";
import Providers from "@/lib/providers";
import { getUserLocalSettings } from "@/lib/userLocalSettings/userLocalSettings";
import { getServerAuthSession } from "@/server/auth";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

import { clientConfig } from "@karakeep/shared/config";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  fallback: ["sans-serif"],
});

export const metadata: Metadata = {
  title: "Keepsake",
  applicationName: "Keepsake",
  description:
    "A personal library for things worth revisiting. Save links, notes, images, and PDFs, then find them when you need them.",
  icons: {
    icon: [
      {
        url: "/icons/logo-icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icons/logo-icon-dark.svg",
        type: "image/svg+xml",
        sizes: "any",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Keepsake",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerAuthSession();
  const userSettings = await getUserLocalSettings();
  const isRTL = userSettings.lang === "ar";
  return (
    <html
      lang={userSettings.lang}
      dir={isRTL ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <body className={`${manrope.className} ${manrope.variable}`}>
        <NuqsAdapter>
          <Providers
            session={session}
            clientConfig={clientConfig}
            userLocalSettings={await getUserLocalSettings()}
          >
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </Providers>
          <Toaster />
        </NuqsAdapter>
      </body>
    </html>
  );
}
