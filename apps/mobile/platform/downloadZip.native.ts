import { File, Paths } from "expo-file-system";
import { isAvailableAsync, shareAsync } from "expo-sharing";
import { Http } from "@/lib/http";

export async function downloadZip(
    ids: string[],
    title: string,
    signal: AbortSignal,
    current: () => boolean
): Promise<void> {
    if (!(await isAvailableAsync())) throw new Error("Sharing unavailable");
    const response = await Http.downloadZipResponse({ ids, title }, signal);
    if (!current() || signal.aborted) {
        await response.body?.cancel();
        return;
    }
    if (
        !response.ok ||
        !response.body ||
        !response.headers.get("content-type")?.includes("application/zip")
    )
        throw new Error("Archive unavailable");
    const file = new File(Paths.cache, `rockit-${Date.now()}.zip`);
    try {
        file.create();
        // Stream to disk rather than keeping potentially large archives in JS memory.
        await response.body.pipeTo(file.writableStream(), { signal });
        if (current() && !signal.aborted)
            await shareAsync(file.uri, {
                mimeType: "application/zip",
                UTI: "public.zip-archive",
            });
    } finally {
        if (file.exists) file.delete();
    }
}
