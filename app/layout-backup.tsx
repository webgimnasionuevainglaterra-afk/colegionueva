import type { Metadata } from "next";
import { Nunito_Sans, Bitter, Inter } from "next/font/google";
import "./globals.css";
import "../css/header.css";
import Providers from "@/components/Providers";

const nunitoSans = Nunito_Sans({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-nunito-sans',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

const bitter = Bitter({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-bitter',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-google-sans',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

