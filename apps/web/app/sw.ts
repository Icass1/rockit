/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
    CacheableResponsePlugin,
    CacheFirst,
    ExpirationPlugin,
    NetworkFirst,
    NetworkOnly,
    Serwist,
    StaleWhileRevalidate,
} from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}
declare const self: ServiceWorkerGlobalScope;

// Streaming must be matched before API caches and Serwist's default media
// routes. Keep Range headers and partial responses untouched, and never clone
// a media response into Cache Storage (which can drain the entire stream).
const runtimeCaching = [
    {
        matcher: ({ url, request }: { url: URL; request: Request }) =>
            request.headers.has("range") ||
            request.destination === "audio" ||
            request.destination === "video" ||
            /^\/youtube\/video\/[^/]+\/stream(?:\/|$)/.test(url.pathname) ||
            url.pathname.startsWith("/rockit/audio/") ||
            /^\/rockit\/video\/[^/]+\/stream(?:\/|$)/.test(url.pathname),
        handler: new NetworkOnly(),
    },
    {
        matcher: ({ url }: { url: URL }) =>
            url.origin !== self.location.origin &&
            url.pathname.startsWith("/media/collection/"),
        handler: new NetworkFirst({
            cacheName: "rockit-collections",
            networkTimeoutSeconds: 3,
            plugins: [
                new CacheableResponsePlugin({ statuses: [200] }),
                new ExpirationPlugin({
                    maxEntries: 100,
                    maxAgeSeconds: 7 * 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
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
    // Detail lookups — StaleWhileRevalidate.
    // Content is keyed by publicId and effectively immutable, so serving a
    // cached copy instantly and revalidating in the background is safe:
    // metadata changes become visible on the visit after next.
    {
        matcher: ({ url }: { url: URL }) =>
            /^\/(media\/(song|album|artist|playlist|station|video)|rockit\/(song|album)|radio\/station|spotify\/(track|album|artist|playlist)|youtube\/(video|chanel)|lrclib\/lyrics)\//.test(
                url.pathname
            ),
        handler: new StaleWhileRevalidate({
            cacheName: "rockit-details",
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 500,
                    maxAgeSeconds: 7 * 24 * 60 * 60,
                    purgeOnQuotaError: true,
                }),
            ],
        }),
    },
    // Screen hooks own account-scoped snapshots and apply the live response.
    // Never turn their refresh request into a stale service worker response.
    {
        matcher: ({ url }: { url: URL }) =>
            url.pathname === "/stats/home" ||
            url.pathname === "/user/library/medias",
        handler: new NetworkOnly(),
    },
    // Changing lists — NetworkFirst with a short timeout so a slow or flaky
    // network falls back to the cached snapshot instead of hanging forever.
    {
        matcher: ({ url }: { url: URL }) =>
            url.pathname.startsWith("/stats/") ||
            url.pathname.startsWith("/featured/") ||
            url.pathname === "/user/library/medias" ||
            url.pathname === "/user/liked-media" ||
            url.pathname === "/bookmark/list",
        handler: new NetworkFirst({
            cacheName: "rockit-lists",
            networkTimeoutSeconds: 3,
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 50,
                    maxAgeSeconds: 24 * 60 * 60,
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
        matcher: ({
            request,
            sameOrigin,
        }: {
            request: Request;
            sameOrigin: boolean;
        }) =>
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
