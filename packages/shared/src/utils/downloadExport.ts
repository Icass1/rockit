import type { BaseHttp } from "@/http/baseHttp";
import { isFeaturedCollectionId } from "@/http/collectionHttp";

const extensions: Record<string, string> = {
    "application/vnd.android.package-archive": ".apk",
    "application/zip": ".zip",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/flac": ".flac",
    "audio/x-flac": ".flac",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/ogg": ".ogg",
};

export function exportFilename(
    disposition: string | null,
    contentType: string | null,
    title: string
): string {
    const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    let filename: string | undefined;
    if (encoded) {
        try {
            filename = decodeURIComponent(encoded);
        } catch {
            /* Fall back to the plain attachment name. */
        }
    }
    filename ??=
        disposition
            ?.match(/filename="((?:\\.|[^"])*)"/i)?.[1]
            ?.replace(/\\(.)/g, "$1") ??
        disposition?.match(/filename=([^;]+)/i)?.[1]?.trim();
    const clean = (value: string) =>
        value
            .replace(/[\\/:*?"<>|]/g, "_")
            .replace(/\p{Cc}/gu, "_")
            .trim();
    if (filename && clean(filename) && ![".", ".."].includes(clean(filename)))
        return clean(filename);
    const extension =
        extensions[(contentType ?? "").split(";")[0].trim().toLowerCase()] ??
        ".zip";
    return `${clean(title) || "media"}${extension}`;
}

/** Resolve virtual featured lists without sending their IDs to database-only export APIs. */
export async function resolveExportIds(
    http: typeof BaseHttp,
    ids: string[],
    current: () => boolean
): Promise<string[]> {
    const resolved = new Set<string>();
    for (const raw of new Set(ids)) {
        if (!current()) throw new Error("Obsolete export");
        const id = raw.startsWith("featured:") ? raw.slice(9) : raw;
        if (!isFeaturedCollectionId(id)) {
            resolved.add(id);
            continue;
        }
        const response = await http.resolveCollectionQueue(id);
        if (!current()) throw new Error("Obsolete export");
        if (!response.isOk()) throw new Error(response.message);
        for (const { media } of response.result.queue)
            if (media.type === "song" || media.type === "video")
                resolved.add(media.publicId);
    }
    return [...resolved];
}
