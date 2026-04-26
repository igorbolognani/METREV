/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    devtoolSegmentExplorer: false,
  },
  transpilePackages: ['@metrev/domain-contracts', '@metrev/auth'],
};

export default nextConfig;
