/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
    unoptimized: true,
  },
  // Configuração para usar whatsapp-web.js no servidor
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        "whatsapp-web.js": "commonjs whatsapp-web.js",
      })
    }
    return config
  },
}

export default nextConfig
