import { Http } from "@/lib/http";

export async function downloadZip(
    ids: string[],
    title: string,
    signal: AbortSignal,
    current: () => boolean
): Promise<void> {
    const result = await Http.downloadBinary(
        Http.downloadZipURL(),
        { ids, title },
        signal
    );
    if (!current() || signal.aborted) return;
    if (!result.isOk() || !result.result) throw new Error(result.message);
    const url = URL.createObjectURL(result.result);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.replace(/[\\/:*?"<>|]/g, "_")}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
