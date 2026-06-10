import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import Providers from "@/components/Providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ThinkNEXT Studio AI | Turn Ideas Into Videos",
  description: "Generate scripts, voiceovers, and avatar videos from a single workflow powered by AI — by ThinkNEXT Technologies. No complex editing required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geistSans.variable, geistMono.variable)}>
      <body
        className="antialiased min-h-screen bg-[#fcfcfc] text-gray-900"
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
