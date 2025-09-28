import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/toast-provider";
import { LogoProvider } from "@/contexts/logo-context";
import { fetchLogo } from "@/lib/logo-service";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CME Platform",
  description: "Continuing Medical Education Platform for Healthcare Professionals",
};

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
