import {
    BACKEND_URL,
    BaseHttp,
    HttpResult,
    IApiFetchOptions,
} from "@/shared/index";
import { Directory, File, Paths } from "expo-file-system";
import { getItemAsync } from "expo-secure-store";
import { saveSessionCookie } from "@/lib/api";
import {
    denormalizeAndLoad,
    ensureMediaDirs,
    normalizeAndSave,
} from "@/lib/http/storageNormalizer";

export class Http extends BaseHttp {
    protected static override async baseApiFetchAsync(
        path: string,
        options: IApiFetchOptions = {}
    ): Promise<Response> {
        const simulateOffline = false;

        if (simulateOffline) {
            throw new TypeError("Network request failed");
        }

        const { method = "GET", headers, body, signal } = options;

        const SESSION_KEY = "session_id";

        const cookie = await getItemAsync(SESSION_KEY);

        const requestHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            ...(typeof headers === "object" && !Array.isArray(headers)
                ? (headers as Record<string, string>)
                : {}),
            ...(cookie ? { Cookie: `session_id=${cookie}` } : {}),
        };

        const response = await fetch(`${BACKEND_URL}${path}`, {
            method,
            headers: requestHeaders,
            body,
            credentials: "include",
            signal,
        });

        await saveSessionCookie(response);

        return response;
    }
}

const routes: { [key: string]: string } = {
    "/vocabulary/user": "vocabulary.json",
    "/user/session": "session.json",
    "/user/library/medias": "libraryMedias.json",
    "/user/queue": "userQueue.json",
    "/media/album/<id>": "album/<id>.json",
    "/media/playlist/<id>": "playlist/<id>.json",
    "/lyrics/dynamic/<id>": "lyrics/dynamic/<id>.json",
};

function resolveRoute(path: string): string | undefined {
    if (path.startsWith("/media/collection/")) {
        // Keep each page/search separate, using bounded filename segments.
        const key = encodeURIComponent(path.replace(/\/queue$/, "/playable"));
        return `collections/${key.match(/.{1,100}/g)?.join("/")}.json`;
    }
    for (const [pattern, target] of Object.entries(routes)) {
        const names = [...pattern.matchAll(/<([^>]+)>/g)].map((m) => m[1]);

        const regex = new RegExp(
            "^" + pattern.replace(/<[^>]+>/g, "(.+)") + "$"
        );

        const match = path.match(regex);
        if (!match) continue;

        let result = target;

        names.forEach((name, i) => {
            result = result.replaceAll(`<${name}>`, match[i + 1]);
        });

        return result;
    }

    return undefined;
}

ensureMediaDirs();
["lyrics", "lyrics/dynamic"].map((dirname) => {
    const dir = new Directory(Paths.document, dirname);
    dir.create({ idempotent: true });
});

// Reset middlewares.
Http.middlewares = [];

// Add middlewares.
Http.middlewares.push(async (next, context) => {
    const response = await next();

    if (response.code === 401) {
        return response;
    }
    const filePath = resolveRoute(context.path);

    if (filePath) {
        const parent = new Directory(
            Paths.document,
            ...filePath.split("/").slice(0, -1)
        );
        const file = new File(Paths.document, filePath);
        if (response.isOk()) {
            // Cache to disk in the background. normalizeAndSave performs one
            // synchronous file write per media object, which can take several
            // seconds for large responses — do not block the response on it.
            void (async () => {
                try {
                    parent.create({ idempotent: true, intermediates: true });
                    const normalized = context.path.startsWith(
                        "/media/collection/"
                    )
                        ? response.result
                        : await normalizeAndSave(response.result);
                    file.write(JSON.stringify(normalized));
                } catch {
                    // Caching is best-effort; ignore write failures.
                }
            })();
        } else {
            if (context.options.method && context.options.method !== "GET")
                return response;
            if (!file.exists) {
                return new HttpResult({
                    code: 404,
                    ok: false,
                    message: `File ${filePath} not found`,
                    detail: {},
                });
            }

            const contents = await file.text();
            let json;
            try {
                json = JSON.parse(contents);
            } catch {
                return new HttpResult({
                    code: 403,
                    ok: false,
                    message: "Error parsing JSON file",
                    detail: {},
                });
            }

            const denormalized = await denormalizeAndLoad(json);

            return new HttpResult({
                code: 200,
                ok: true,
                message: "From middleware",
                result: context.schema.parse(denormalized),
            });
        }
    }

    return response;
});
