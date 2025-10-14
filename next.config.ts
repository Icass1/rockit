import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
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
    // Remove the entire `webpack` function and `watchOptions` property for now
    // The `experimental.turbo` section can stay, but ensure it's correctly formatted
};

export default nextConfig;
