import path from "path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development" || true;

const nextConfig: NextConfig = {
    transpilePackages: ["@rockit/packages", "@rockit/shared"],
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            "@/lib": path.resolve(__dirname, "./lib"),
            "@/dto": path.resolve(__dirname, "../../packages/shared/src/dto"),
            "@/environment": path.resolve(
                __dirname,
                "../../packages/shared/src/environment"
            ),
            "@/types": path.resolve(
                __dirname,
                "../../packages/shared/src/types"
            ),
            "@/models": path.resolve(
                __dirname,
                "../../packages/shared/src/models"
            ),
        };
        return config;
    },
    turbopack: {
        root: path.resolve(__dirname, "..", ".."),
    },
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
                hostname: "api-beta-rockit.rockhosting.org",
                pathname: "/image/**",
            },
        ],
    },
};

export default nextConfig;
