import type { Metadata } from "next";
import { Nunito_Sans, Bitter, Inter } from "next/font/google";
import "./globals.css";
import "../css/header.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ConditionalLayout from "@/components/ConditionalLayout";

const nunitoSans = Nunito_Sans({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-nunito-sans',
});

const bitter = Bitter({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-bitter',
});

const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-google-sans',
});

export const metadata: Metadata = {
  title: "Colegio Nueva - Plataforma Educativa",
  description: "Plataforma educativa para el Colegio Nueva",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${nunitoSans.variable} ${bitter.variable} ${inter.variable}`}>
      <body>
        <LanguageProvider>
          <AuthProvider>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

