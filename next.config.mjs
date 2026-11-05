/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: 'unqvfsawjjzfpkxkqaya.supabase.co' }] },
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
};
export default nextConfig;
