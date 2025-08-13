import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  basePath: '/SichrPlace77',
  assetPrefix: '/SichrPlace77/',
};

export default nextConfig;
