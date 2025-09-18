import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    watchOptions: {
        pollIntervalMs: 1000,
    },
    images: {
        remotePatterns: [
            {
                protocol: "http",
                hostname: "localhost",
                port: "8000",
                pathname: "/**",
                search: "",
            },
        ],
    },
};

export default nextConfig;
