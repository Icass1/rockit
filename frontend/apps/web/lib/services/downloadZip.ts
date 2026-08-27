import type { TMediaWithSearch } from "@/models/types/media";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

function filenamePart(value: string): string {
    return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "media";
}

export async function downloadMediaAsZip(
    media: TMediaWithSearch[],
    archiveName: string
): Promise<void> {
    const ids = media.flatMap((item) =>
        "publicId" in item ? [item.publicId] : []
    );
    if (ids.length === 0) {
        return;
    }

    const response = await Http.downloadZip({ ids, title: archiveName });
    if (response.isNotOk()) {
        rockIt.notificationManager.notifyError(
            rockIt.vocabularyManager.vocabulary.ERROR_STARTING_DOWNLOAD
        );
        return;
    }

    if (!response.result) return;
    const blob = response.result;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filenamePart(archiveName)}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
}
