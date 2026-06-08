import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getThemeClassName } from "@/lib/theme";
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
  title: "Stockeado - Gestión de Inventario",
  description: "Sistema avanzado de gestión de inventario y punto de venta para negocios.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const userTheme = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { themeMode: true },
      })
    : null;
  const themeClassName = getThemeClassName(userTheme?.themeMode ?? session?.user?.themeMode);

  return (
    <html lang="es" className={`h-full ${themeClassName}`} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full overflow-hidden`}
      >
        <div className="h-full overflow-y-auto">
          {children}
        </div>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
