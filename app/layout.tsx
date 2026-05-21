import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/toast-provider";
import { LogoProvider } from "@/contexts/logo-context";
import { fetchLogo, fetchFavicon } from "@/lib/logo-service";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Dynamic metadata so the favicon from the database is injected into <head> on every request
export async function generateMetadata(): Promise<Metadata> {
  const favicon = await fetchFavicon();

  return {
    title: "CME Platform",
    description: "Continuing Medical Education Platform for Healthcare Professionals",
    icons: favicon?.url
      ? {
          icon: [{ url: favicon.url }],
          apple: [{ url: favicon.url }],
        }
      : {
          icon: [{ url: "/favicon.ico" }],
        },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const logo = await fetchLogo();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LogoProvider logo={logo}>
          {children}
          <Toaster />
          <ToastProvider />
        </LogoProvider>
      </body>
    </html>
  );
}
