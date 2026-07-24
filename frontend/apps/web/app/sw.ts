/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
    Serwist,
    StaleWhileRevalidate,
    CacheFirst,
    NetworkFirst,
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
    // Session — NetworkFirst with short timeout (falls back to SW cache if offline/slow)
    {
        matcher: ({ url }: { url: URL }) =>
            url.origin !== self.location.origin &&
            url.pathname === "/user/session",
        handler: new NetworkFirst({
            cacheName: "rockit-session",
            networkTimeoutSeconds: 3,
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 1,
                    maxAgeSeconds: 7 * 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
    // Vocabulary — StaleWhileRevalidate (serve cache immediately, update in background)
    {
        matcher: ({ url }: { url: URL }) =>
            url.origin !== self.location.origin &&
            url.pathname.startsWith("/vocabulary/"),
        handler: new StaleWhileRevalidate({
            cacheName: "rockit-vocabulary",
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 1,
                    maxAgeSeconds: 30 * 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
    // Catch-all for other cross-origin requests — no caching
    {
        matcher: ({ url, request }: { url: URL; request: Request }) =>
            url.origin !== self.location.origin ||
            (url.pathname.startsWith("/api/") &&
                request.destination !== "document"),
        handler: new NetworkOnly(),
    },
    {
        matcher: ({ url, request }: { url: URL; request: Request }) =>
            request.destination === "image" ||
            url.pathname.startsWith("/media/image/"),
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
