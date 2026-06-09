/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Tree-shake large icon/animation libs — significantly reduces JS parse time
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-tooltip'],
  },
};

export default nextConfig;

