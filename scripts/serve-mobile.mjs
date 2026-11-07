import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

// Production-export preview; static hosting uses the same SPA fallback.
const root = path.resolve(import.meta.dirname, "../apps/mobile/dist");
const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
};
http.createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(
            new URL(request.url, "http://localhost").pathname
        );
        let file = path.resolve(root, "." + pathname);
        if (file !== root && !file.startsWith(root + path.sep)) {
            response.writeHead(403);
            response.end();
            return;
        }
        try {
            if (!(await stat(file)).isFile())
                file = path.join(root, "index.html");
        } catch {
            if (path.extname(pathname)) {
                response.writeHead(404);
                response.end();
                return;
            }
            file = path.join(root, "index.html");
        }
        response.writeHead(200, {
            "content-type":
                types[path.extname(file)] ?? "application/octet-stream",
            "cache-control": file.includes("/_expo/static/")
                ? "public, max-age=31536000, immutable"
                : "no-cache",
        });
        response.end(await readFile(file));
    } catch {
        response.writeHead(500);
        response.end();
    }
}).listen(Number(process.env.PORT ?? 13001), "127.0.0.1");
