import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['yondra.net', '*.yondra.net'],
};

export default nextConfig;
