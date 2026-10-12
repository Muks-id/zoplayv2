import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Parkinsans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { idID } from "@clerk/localizations";
import { ThemeProvider } from "@/components/theme-provider";
import { VipProvider } from "@/components/vip-provider";
import { RouteProgress } from "@/components/route-progress";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const parkinsans = Parkinsans({
  variable: "--font-parkinsans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "ZOPLAY | Temukan Game Favoritmu",
  description: "Katalog game PC dan Android pilihan untuk para player.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="id" suppressHydrationWarning>
        <body
          className={`${geistSans.className} ${geistMono.className} ${parkinsans.className} antialiased`}
        >
        <Suspense fallback={null}><RouteProgress /></Suspense>
        <ClerkProvider
          localization={idID}
          appearance={{
            variables: {
              colorPrimary: "#9be15d",
              colorBackground: "#111715",
              colorText: "#f2f5f1",
              colorInputBackground: "#171f1c",
              colorInputText: "#f2f5f1",
            },
              elements: { 
                userButtonPopoverFooter: "clerk-hide-footer", 
                userButtonPopoverActionButtonText: "clerk-white-text", 
                userButtonPopoverActionButtonIcon: "clerk-white-text", 
                socialButtonsBlockButtonText: "clerk-white-text", 
              }, 
          }}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <VipProvider>
              {children}
            </VipProvider>
          </ThemeProvider>
        </ClerkProvider>
        </body>
      </html>
  );
}
