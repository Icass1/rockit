import { createHash } from "node:crypto";
import { cp, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../apps/mobile");
const output = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(root, "dist");
const tokens = JSON.parse(
    await readFile(
        path.resolve(root, "../../packages/theme/src/tokens.json"),
        "utf8"
    )
);
const htmlPath = path.join(output, "index.html");
let html = await readFile(htmlPath, "utf8");
await cp(
    path.join(root, "assets/images/logo-512.png"),
    path.join(output, "icon.png")
);
await cp(path.resolve(root, "../../packages/ui/assets/rockit-background.png"), path.join(output, "rockit-background.png"));
await cp(path.resolve(root, "../../packages/ui/assets/recap-covers"), path.join(output, "recap-covers"), { recursive: true });
const manifest = {
    id: "/",
    name: "RockIt!",
    short_name: "RockIt!",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: tokens.themes.dark.background,
    theme_color: tokens.themes.dark.background,
    icons: [
        {
            src: "/icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
        },
    ],
};
await writeFile(
    path.join(output, "manifest.webmanifest"),
    JSON.stringify(manifest)
);
html = html.replace(
    /<!-- rockit-mobile-pwa:start -->[\s\S]*?<!-- rockit-mobile-pwa:end -->/g,
    ""
);
html = html.replace(/<meta\s+name="viewport"[^>]*>/gi, "");
html = html.replace(/<meta\s+name="theme-color"[^>]*>/gi, "");
html = html.replace(
    "</head>",
    `<!-- rockit-mobile-pwa:start --><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="${tokens.themes.dark.background}"><style>html,body,#root{background:${tokens.themes.dark.background};color-scheme:dark;}html,body{margin:0;height:100%;}</style><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><!-- rockit-mobile-pwa:end --></head>`
);
await writeFile(htmlPath, html);
const shell = [
    "/",
    "/index.html",
    "/manifest.webmanifest",
    "/icon.png",
    ...Array.from(
        html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))"/g),
        (item) => item[1]
    ).filter((value) => value.startsWith("/")),
];
const files = (await readdir(output, { recursive: true }))
    .filter(
        (file) =>
            file !== "sw.js" &&
            (/\.(?:js|css|html|webmanifest)$/.test(file) || file === "icon.png" || file === "rockit-background.png" || file.startsWith("recap-covers/"))
    )
    .sort();
const artwork = files.filter(file => file === "rockit-background.png" || file.startsWith("recap-covers/")).map(file => "/" + file);
const hash = createHash("sha256");
for (const file of files) hash.update(await readFile(path.join(output, file)));
const cache = `rockit-mobile-shell-${hash.digest("hex").slice(0, 16)}`;
await writeFile(
    path.join(output, "sw.js"),
    `
const CACHE = ${JSON.stringify(cache)};
const SHELL = ${JSON.stringify(shell)};
const ARTWORK = ${JSON.stringify(artwork)};
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))));
self.addEventListener("activate", event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("rockit-mobile-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
// Prime only public chunks the current page has already loaded before activation.
self.addEventListener("message", event => {
    if (event.data?.type !== "CACHE_STATIC_ASSETS" || !Array.isArray(event.data.urls)) return;
    const urls = event.data.urls.slice(0, 100).map(value => new URL(value, self.location.origin)).filter(url => url.origin === self.location.origin && url.pathname.startsWith("/_expo/static/"));
    event.waitUntil(caches.open(CACHE).then(cache => Promise.allSettled(urls.map(url => cache.add(url.href)))).then(() => event.ports[0]?.postMessage({ready:true})));
});
self.addEventListener("fetch", event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== "GET" || request.headers.has("range") || url.origin !== self.location.origin) return;
    if (request.mode === "navigate") {
        event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
        return;
    }
    // Only public build assets: never API responses, media or signed URLs.
    if (!url.pathname.startsWith("/_expo/static/") && !SHELL.includes(url.pathname) && !ARTWORK.includes(url.pathname)) return;
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok && response.type !== "opaque") {
            const copy = response.clone();
            void caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
    })));
});
`
);
process.stdout.write(
    `Prepared mobile PWA shell (${shell.length} entries, ${cache}).\n`
);
