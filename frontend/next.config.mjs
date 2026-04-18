/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBase) return [];
    return [];
  },
};

export default nextConfig;
