import { exportFilename, resolveExportIds } from "@rockit/shared";
import { Directory, File, Paths } from "expo-file-system";
import { isAvailableAsync, shareAsync } from "expo-sharing";
import { Http } from "@/lib/http";

export async function downloadZip(
    ids: string[],
    title: string,
    signal: AbortSignal,
    current: () => boolean
): Promise<void> {
    if (!current() || signal.aborted) return;
    if (!(await isAvailableAsync())) throw new Error("Sharing unavailable");
    const resolved = await resolveExportIds(
        Http,
        ids,
        () => current() && !signal.aborted
    );
    if (!resolved.length) throw new Error("No media to export");
    const response = await Http.downloadZipResponse(
        { ids: resolved, title },
        signal
    );
    if (!current() || signal.aborted) {
        await response.body?.cancel();
        return;
    }
    const mimeType = response.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase();
    if (
        !response.ok ||
        !response.body ||
        !mimeType ||
        !(mimeType === "application/zip" || mimeType.startsWith("audio/"))
    )
        throw new Error("Export unavailable");
    const filename = exportFilename(
        response.headers.get("content-disposition"),
        mimeType,
        title
    );
    const directory = new Directory(
        Paths.cache,
        `rockit-export-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    const file = new File(directory, filename);
    try {
        directory.create();
        file.create();
        await response.body.pipeTo(file.writableStream(), { signal });
        if (current() && !signal.aborted)
            await shareAsync(file.uri, {
                mimeType,
                UTI:
                    mimeType === "application/zip"
                        ? "public.zip-archive"
                        : mimeType === "audio/mpeg"
                          ? "public.mp3"
                          : mimeType === "audio/mp4"
                            ? "public.mpeg-4-audio"
                            : "public.audio",
            });
    } finally {
        if (directory.exists) directory.delete();
    }
}
