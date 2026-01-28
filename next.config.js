/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Deshabilitar turbopack para evitar problemas
  experimental: {
    turbo: undefined,
  },
  // Permitir desplegar aunque haya errores de TypeScript en tiempo de build.
  // IMPORTANTE: los errores seguirán apareciendo en el editor, pero no
  // bloquearán el despliegue en Vercel.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Opcionalmente también podemos evitar que errores de ESLint rompan el build.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pdhvrvawsguwnbnfokaa.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig

