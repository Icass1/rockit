import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
    images: {
        // Only disable image optimization in dev
        unoptimized: isDev,
        remotePatterns: [
            {
                protocol: "http",
                hostname: "localhost",
                port: "8000",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "*.scdn.co",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "api.beta.rockit.rockhosting.org",
                pathname: "/image/**",
            },
        ],
    },
    env: {
        NEXT_PUBLIC_BACKEND_URL: "http://localhost:8000",
    },
};

export default nextConfig;
