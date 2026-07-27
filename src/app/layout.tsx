import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "../../auth";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Vibe CRM",
  description: "CRM ligero para equipos de venta digital",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen antialiased">
        <SessionProvider session={session} refetchOnWindowFocus={false}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
