import type { NextConfig } from "next";
import { wgslTurbopackRule } from "@vgpu/wgsl/next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.wgsl": wgslTurbopackRule(),
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.wgsl$/,
      use: ["@vgpu/wgsl/loader-webpack"],
    });
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },

  // Exclude native node WebGPU bindings from bundle
  serverExternalPackages: ["@vgpu/adapter-node", "webgpu"],
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
