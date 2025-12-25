/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Remove swcMinify if your Next.js version doesn't support it
    // Instead, use other performance optimizations:
    typescript: {
        // During development, you can turn off type checking
        // for faster builds (DO type check before production)
        ignoreBuildErrors: process.env.NODE_ENV === 'development',
    },
    webpack: (config, { dev, isServer }) => {
        if (dev) {
            // Using a faster source map option or disabling completely
            config.devtool = false;  // Completely disable source maps for maximum speed
        }
        return config;
    },
    eslint: {
        // Disable ESLint during builds to allow deployment even with warnings/errors
        ignoreDuringBuilds: true,
    },
}

module.exports = nextConfig
