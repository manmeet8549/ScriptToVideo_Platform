/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Allow production builds to successfully complete even if the project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Tree-shake large icon/animation libs — significantly reduces JS parse time
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-tooltip'],
  },
};

export default nextConfig;

