import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Unsplash CDN for sample photography presets
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // Optimize icon imports
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },

  // Exclude native node WebGPU bindings from bundle
  serverExternalPackages: ["@vgpu/adapter-node", "webgpu"],

  // Allow camera access for live webcam dithering
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
