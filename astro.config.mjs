// @ts-check
import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";

import node from "@astrojs/node";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
    prefetch: false,
    integrations: [tailwind(), react()],
    vite: {
        server: { watch: { ignored: ["**/venv/**", "**venv**"] } },
    },
    output: "server",
    server: {
        host: "0.0.0.0",
    },
    adapter: node({
        mode: "standalone",
    }),
});
