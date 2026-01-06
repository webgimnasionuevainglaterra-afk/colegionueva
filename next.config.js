/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Deshabilitar turbopack para evitar problemas
  experimental: {
    turbo: undefined,
  },
}

module.exports = nextConfig

