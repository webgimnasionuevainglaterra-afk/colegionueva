/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Deshabilitar turbopack para evitar problemas
  experimental: {
    turbo: undefined,
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

