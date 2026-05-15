/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@oneplace/types'],
  poweredByHeader: false,
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
