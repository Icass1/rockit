import { resolveExportIds } from "@rockit/shared";
import { ENotificationType } from "@/models/enums/notificationType";
import type { TMediaWithSearch } from "@/models/types/media";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export async function downloadMediaAsZip(
    media: TMediaWithSearch[],
    archiveName: string
): Promise<void> {
    const session = rockIt.userManager.sessionAtom.get();
    const current = () => rockIt.userManager.sessionAtom.get() === session;
    const selected = media.flatMap((item) =>
        "publicId" in item && typeof item.publicId === "string"
            ? [item.publicId]
            : []
    );
    if (selected.length === 0) {
        return;
    }

    let ids: string[];
    try {
        ids = await resolveExportIds(Http, selected, current);
    } catch {
        if (current())
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.ERROR_STARTING_DOWNLOAD
            );
        return;
    }
    if (!current() || !ids.length) return;
    const response = await Http.downloadBinary(Http.downloadZipURL(), {
        ids,
        title: archiveName,
    });
    if (!current()) return;
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

    const url = URL.createObjectURL(response.result.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = response.result.filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    const vocabulary = rockIt.vocabularyManager.vocabulary as unknown as Record<
        string,
        string
    >;
    rockIt.notificationManager.notify(
        ENotificationType.SUCCESS,
        vocabulary.NOTIFICATIONS_ZIP_READY,
        {
            category: "download",
            detail: `${archiveName} · ${vocabulary.NOTIFICATIONS_ZIP_DETAIL}`,
        }
    );

    // Firefox only downloads from an anchor attached to the document, and
    // revoking the object URL synchronously can abort the download that the
    // click just started.
    setTimeout((): void => {
        anchor.remove();
        URL.revokeObjectURL(url);
    }, 0);
}
