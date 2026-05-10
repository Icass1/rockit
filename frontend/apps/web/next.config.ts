import path from "path";
import type { NextConfig } from "next";

const stubsDir = path.resolve(__dirname, "./stubs");
const turbopackRoot = path.resolve(__dirname, "..", "..");
const stubsDirRelative = path.relative(turbopackRoot, stubsDir);

const isDev = process.env.NODE_ENV === "development" || true;

const nextConfig: NextConfig = {
    transpilePackages: ["@rockit/packages", "@rockit/shared"],
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            "expo-secure-store": path.resolve(stubsDir, "expo-secure-store"),
            "expo-modules-core": path.resolve(stubsDir, "expo-modules-core"),
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
        root: turbopackRoot,
        resolveAlias: {
            "expo-secure-store": "./" + path.join(stubsDirRelative, "expo-secure-store"),
            "expo-modules-core": "./" + path.join(stubsDirRelative, "expo-modules-core"),
        },
    },
    images: {
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
    allowedDevOrigins: ["ignaciodev"],
};

export default nextConfig;
