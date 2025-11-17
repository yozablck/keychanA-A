const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  // Fix workspace root warning
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  // Exclude React Three Fiber from SSR
  webpack: (config, { isServer }) => {
    // Add path aliases to match tsconfig
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/components/ui': path.resolve(__dirname, 'src/components/ui'),
      '@/components/ConvexClientProvider': path.resolve(__dirname, 'components/ConvexClientProvider'),
      '@/components/CollectionsContent': path.resolve(__dirname, 'components/CollectionsContent'),
      '@/components/PricingContent': path.resolve(__dirname, 'components/PricingContent'),
      '@/components/Footer': path.resolve(__dirname, 'components/Footer'),
      '@/components/Navbar': path.resolve(__dirname, 'src/components/Navbar'),
      '@/components/ViewportCanvas': path.resolve(__dirname, 'src/components/ViewportCanvas'),
      '@/components/ViewportCanvasWrapper': path.resolve(__dirname, 'src/components/ViewportCanvasWrapper'),
      '@/components/CustomizationPanel': path.resolve(__dirname, 'src/components/CustomizationPanel'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
    };


    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@react-three/fiber': 'commonjs @react-three/fiber',
        '@react-three/drei': 'commonjs @react-three/drei',
      });
    }
    return config;
  },
}

module.exports = nextConfig

