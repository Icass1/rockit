import path from "path";
import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
    output: "standalone",
    outputFileTracingRoot: path.join(__dirname, "../.."),
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
        dangerouslyAllowLocalIP: isDev || process.env.ALLOW_LOCAL_IP === "true",
        deviceSizes: [16, 32, 48, 64, 96, 128, 256, 384, 600, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
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
                hostname: "yt3.googleusercontent.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "api-beta-rockit.rockhosting.org",
                pathname: "/media/image/**",
            },
        ],
    },
    allowedDevOrigins: ["ignaciodev"],
};

export default withSerwist(nextConfig);
