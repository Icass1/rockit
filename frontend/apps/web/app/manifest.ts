import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/",
        name: "RockIt!",
        short_name: "RockIt",
        start_url: "/",
        scope: "/",
        categories: ["music"],
        display: "standalone",
        theme_color: "#000000",
        background_color: "#000000",
        orientation: "portrait",
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
