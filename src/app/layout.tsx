import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import Providers from "@/components/Providers";
import { headers } from "next/headers";
import { getTenantContext } from "@/lib/tenant";

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

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const tenant = await getTenantContext(host);

  if (tenant) {
    return {
      title: `${tenant.name} | AI Video Production`,
      description: `Create premium AI-powered videos and scripts for ${tenant.name}.`,
      icons: {
        icon: tenant.logo || "/favicon.ico",
      },
    };
  }

  return {
    title: "ThinkNEXT Studio AI | Turn Ideas Into Videos",
    description: "Generate scripts, voiceovers, and avatar videos from a single workflow powered by AI — by ThinkNEXT Technologies. No complex editing required.",
    icons: {
      icon: "/favicon.ico",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const tenant = await getTenantContext(host);

  // If organization custom branding color exists, define custom style overrides
  const customStyles = tenant
    ? `
      :root {
        --primary: ${tenant.primaryColor} !important;
        --sidebar-primary: ${tenant.primaryColor} !important;
      }
    `
    : "";

  return (
    <html lang="en" className={cn("font-sans", geistSans.variable, geistMono.variable)} suppressHydrationWarning>
      <body
        className="antialiased min-h-screen bg-[#fcfcfc] text-gray-900"
      >
        {customStyles && (
          <style dangerouslySetInnerHTML={{ __html: customStyles }} />
        )}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
