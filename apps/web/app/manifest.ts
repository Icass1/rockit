import type { MetadataRoute } from "next";
import { designTokens } from "@rockit/theme";

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/",
        name: "RockIt!",
        short_name: "RockIt",
        start_url: "/",
        scope: "/",
        categories: ["music"],
        display: "standalone",
        theme_color: designTokens.themes.dark.background,
        background_color: designTokens.themes.dark.background,
        icons: [
            {
                src: "/logo-512.png",
                sizes: "512x512",
                type: "image/png",
            },
            {
                src: "/logo-192.png",
                sizes: "192x192",
                type: "image/png",
            },
        ],
    };
}
