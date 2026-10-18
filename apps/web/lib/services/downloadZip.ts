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

    const response = await Http.downloadBinary(Http.downloadZipURL(), {
        ids,
        title: archiveName,
    });
    if (response.isNotOk() || !response.result) {
        // The backend explains why (nothing downloaded yet, selection too
        // large), which is far more useful than the generic message. Transport
        // failures carry a raw fetch error instead, so those stay generic.
        const backendMessage =
            response.code >= 400 && typeof response.detail === "string"
                ? response.detail
                : undefined;

        rockIt.notificationManager.notifyError(
            backendMessage ||
                rockIt.vocabularyManager.vocabulary.ERROR_STARTING_DOWNLOAD
        );
        return;
    }

    if (typeof document === "undefined") return;

    const url = URL.createObjectURL(response.result);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filenamePart(archiveName)}.zip`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();

    // Firefox only downloads from an anchor attached to the document, and
    // revoking the object URL synchronously can abort the download that the
    // click just started.
    setTimeout((): void => {
        anchor.remove();
        URL.revokeObjectURL(url);
    }, 0);
}
