import { execFileSync } from "node:child_process";
import path from "path";
import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const isDev = process.env.NODE_ENV === "development";
const s3PublicEndpoint = process.env.NEXT_PUBLIC_S3_PUBLIC_ENDPOINT_URL;
const s3PublicPattern = s3PublicEndpoint
    ? (() => {
          try {
              const endpoint = new URL(s3PublicEndpoint);
              return {
                  protocol: endpoint.protocol.slice(0, -1) as "http" | "https",
                  hostname: endpoint.hostname,
                  ...(endpoint.port ? { port: endpoint.port } : {}),
                  pathname: "/**",
              };
          } catch {
              return null;
          }
      })()
    : null;

const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_APP_VERSION: execFileSync(
            process.execPath,
            [path.join(__dirname, "../../scripts/version.cjs")],
            { encoding: "utf8" }
        ).trim(),
    },
    output: "standalone",
    outputFileTracingRoot: path.join(__dirname, "../.."),
    transpilePackages: ["@rockit/shared"],
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
        deviceSizes: [
            16, 32, 48, 64, 96, 128, 256, 384, 600, 640, 750, 828, 1080, 1200,
            1920, 2048, 3840,
        ],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "commons.wikimedia.org",
                pathname: "/w/thumb.php",
            },
            {
                protocol: "https",
                hostname: "upload.wikimedia.org",
                pathname: "/wikipedia/**",
            },
            {
                protocol: "https",
                hostname: "coverartarchive.org",
                pathname: "/release-group/**",
            },
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
            ...(s3PublicPattern ? [s3PublicPattern] : []),
        ],
    },
    allowedDevOrigins: ["ignaciodev"],
};

export default withSerwist(nextConfig);
