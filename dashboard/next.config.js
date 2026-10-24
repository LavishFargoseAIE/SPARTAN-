/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.SITEGUARD_API_URL || "https://spartan-inle.onrender.com",
  },
};

module.exports = nextConfig;
