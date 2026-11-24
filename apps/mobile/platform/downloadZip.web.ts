import { resolveExportIds } from "@rockit/shared";
import { Http } from "@/lib/http";

export async function downloadZip(
    ids: string[],
    title: string,
    signal: AbortSignal,
    current: () => boolean
): Promise<void> {
    if (!current() || signal.aborted) return;
    const resolved = await resolveExportIds(
        Http,
        ids,
        () => current() && !signal.aborted
    );
    if (!resolved.length) throw new Error("No media to export");
    const result = await Http.downloadBinary(
        Http.downloadZipURL(),
        { ids: resolved, title },
        signal
    );
    if (!current() || signal.aborted) return;
    if (!result.isOk() || !result.result) throw new Error(result.message);
    const url = URL.createObjectURL(result.result.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.result.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
