import { Directory, File, Paths } from "expo-file-system";

const MEDIA_TYPES = new Set([
    "song",
    "video",
    "album",
    "artist",
    "playlist",
    "station",
    "radio",
]);

interface MediaRef {
    publicId: string;
    type: string;
}

const MAX_DEPTH = 2;

// Yield to the event loop after this many synchronous file writes so the
// caching pass never monopolizes the single JS thread and freezes the UI.
const YIELD_EVERY_WRITES = 25;

interface NormalizeState {
    // Media already written this pass, keyed by `${type}/${publicId}` — avoids
    // rewriting the same song/album that appears multiple times in a response.
    written: Set<string>;
    writesSinceYield: number;
}

function yieldToEventLoop(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function isMediaObject(
    obj: unknown
): obj is Record<string, unknown> & MediaRef {
    if (typeof obj !== "object" || obj === null || Array.isArray(obj))
        return false;
    const { publicId, type } = obj as Record<string, unknown>;
    return (
        typeof publicId === "string" &&
        typeof type === "string" &&
        MEDIA_TYPES.has(type)
    );
}

function isRef(obj: unknown): obj is MediaRef {
    if (!isMediaObject(obj)) return false;
    return Object.keys(obj).length === 2;
}

function getDir(type: string): Directory {
    return new Directory(Paths.document, type);
}

function getFile(type: string, publicId: string): File {
    const dir = getDir(type);
    return new File(dir, `${publicId}.json`);
}

function ensureDir(type: string): void {
    getDir(type).create({ idempotent: true });
}

export function ensureMediaDirs(): void {
    for (const type of MEDIA_TYPES) {
        ensureDir(type);
    }
}

async function normalizeValue(
    value: unknown,
    depth: number,
    state: NormalizeState
): Promise<unknown> {
    if (depth > MAX_DEPTH || value === null || value === undefined) {
        return value;
    }

    if (Array.isArray(value)) {
        const result: unknown[] = [];
        for (const item of value) {
            result.push(await normalizeValue(item, depth, state));
        }
        return result;
    }

    if (typeof value === "object") {
        const obj = value as Record<string, unknown>;

        if (isMediaObject(obj)) {
            const normalized: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(obj)) {
                if (key === "publicId" || key === "type") {
                    normalized[key] = val;
                } else {
                    normalized[key] = await normalizeValue(
                        val,
                        depth + 1,
                        state
                    );
                }
            }

            const cacheKey = `${obj.type}/${obj.publicId}`;
            if (!state.written.has(cacheKey)) {
                state.written.add(cacheKey);
                ensureDir(obj.type);
                const file = getFile(obj.type, obj.publicId);
                file.write(JSON.stringify(normalized));

                if (++state.writesSinceYield >= YIELD_EVERY_WRITES) {
                    state.writesSinceYield = 0;
                    await yieldToEventLoop();
                }
            }

            if (depth === 0) {
                return normalized;
            }
            return { publicId: obj.publicId, type: obj.type };
        }

        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(obj)) {
            result[key] = await normalizeValue(val, depth, state);
        }
        return result;
    }

    return value;
}

export async function normalizeAndSave(root: unknown): Promise<unknown> {
    return normalizeValue(root, 0, { written: new Set(), writesSinceYield: 0 });
}

async function denormalizeValue(
    value: unknown,
    depth: number
): Promise<unknown> {
    if (depth > MAX_DEPTH || value === null || value === undefined) {
        return value;
    }

    if (Array.isArray(value)) {
        return Promise.all(value.map((item) => denormalizeValue(item, depth)));
    }

    if (typeof value === "object") {
        const obj = value as Record<string, unknown>;

        if (isRef(obj)) {
            const file = getFile(obj.type, obj.publicId);
            if (file.exists) {
                try {
                    const contents = await file.text();
                    const full = JSON.parse(contents);
                    return denormalizeValue(full, depth + 1);
                } catch {
                    return obj;
                }
            }
            return obj;
        }

        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(obj)) {
            result[key] = await denormalizeValue(val, depth);
        }
        return result;
    }

    return value;
}

export async function denormalizeAndLoad(root: unknown): Promise<unknown> {
    return denormalizeValue(root, 0);
}
