// VERSIÓN MINIMALISTA PARA PRUEBAS
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Colegio Nueva - Test",
  description: "Test",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: '20px', fontFamily: 'Arial' }}>
        {children}
      </body>
    </html>
  );
}
















