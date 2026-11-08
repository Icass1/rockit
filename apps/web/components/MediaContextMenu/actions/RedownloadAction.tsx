"use client";

import type { JSX } from "react";
import { isSearchResult, redownloadMedia } from "@rockit/shared";
import { HardDriveDownload } from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";
import ContextMenuOption from "@/components/ui/ContextMenu/Option";

export default function RedownloadAction({
    media,
    vocabulary,
    setLoading,
}: ActionComponentProps): JSX.Element {
    const redownload = async (): Promise<void> => {
        if (isSearchResult(media)) return;
        setLoading(true);

        try {
            const username = rockIt.userManager.sessionAtom.get()?.username;
            await redownloadMedia(
                Http,
                media,
                () =>
                    !!username &&
                    rockIt.userManager.sessionAtom.get()?.username === username
            );
            rockIt.notificationManager.notifySuccess(
                vocabulary.DOWNLOAD_STARTED
            );
        } catch {
            rockIt.notificationManager.notifyError(
                vocabulary.ERROR_STARTING_DOWNLOAD
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <ContextMenuOption onClick={redownload}>
            <HardDriveDownload className="h-5 w-5" />
            {vocabulary.REDOWNLOAD}
        </ContextMenuOption>
    );
}
