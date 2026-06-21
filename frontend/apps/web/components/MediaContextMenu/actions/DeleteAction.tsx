"use client";

import type { JSX } from "react";
import { isSearchResult } from "@rockit/shared";
import { Trash2 } from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

export default function DeleteAction({
    media,
    vocabulary,
    setLoading,
}: ActionComponentProps): JSX.Element {
    const deleteMedia = async (): Promise<void> => {
        if (isSearchResult(media)) return;
        setLoading(true);
        const res = await Http.deleteMediaAsync(media.publicId);
        if (res.isOk()) {
            rockIt.notificationManager.notifySuccess(vocabulary.DELETE_SUCCESS);
        } else {
            const detail =
                typeof res.detail === "string"
                    ? res.detail
                    : vocabulary.DELETE_ERROR;
            rockIt.notificationManager.notifyError(detail);
        }
        setLoading(false);
    };

    return (
        <ContextMenuOption onClick={deleteMedia}>
            <Trash2 className="h-5 w-5" />
            {vocabulary.DELETE}
        </ContextMenuOption>
    );
}
