import type { Metadata } from "next";
import "./globals.css";
import "../css/header.css";
import Providers from "@/components/Providers";

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
    <html lang="es">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
