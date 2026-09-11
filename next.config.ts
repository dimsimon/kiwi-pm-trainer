import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '*.ngrok-free.dev',
    '*.ngrok.io',
    '192.168.1.71',
    'localhost:3000',
  ],
};

export default nextConfig;