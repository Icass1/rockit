/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
    Serwist,
    StaleWhileRevalidate,
    CacheFirst,
    NetworkOnly,
    ExpirationPlugin,
} from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}
declare const self: ServiceWorkerGlobalScope;

const runtimeCaching = [
    {
        matcher: ({ url }: { url: URL }) =>
            url.pathname.startsWith("/api/") ||
            url.pathname.startsWith("/stats") ||
            url.pathname.startsWith("/user/"),
        handler: new NetworkOnly(),
    },
    {
        matcher: ({ url }: { url: URL }) =>
            url.pathname.startsWith("/api/song/audio"),
        handler: new NetworkOnly(),
    },
    {
        matcher: ({ request }: { request: Request }) =>
            request.destination === "image",
        handler: new CacheFirst({
            cacheName: "rockit-images",
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 300,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
    {
        matcher: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
            sameOrigin &&
            (request.headers.get("RSC") === "1" ||
                request.destination === "document"),
        handler: new StaleWhileRevalidate({
            cacheName: "rockit-pages",
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 100,
                    maxAgeSeconds: 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
    ...defaultCache,
];

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching,
    fallbacks: {
        entries: [
            {
                url: "/~offline",
                matcher({ request }: { request: Request }) {
                    return request.destination === "document";
                },
            },
        ],
    },
});

serwist.addEventListeners();
