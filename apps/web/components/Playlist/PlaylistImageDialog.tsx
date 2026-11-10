"use client";

import { useId, useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import type { BasePlaylistWithoutMediasResponse } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FileInput } from "@/components/ui/FileInput";

export default function PlaylistImageDialog({
    playlist,
    onClose,
}: {
    playlist: BasePlaylistWithoutMediasResponse;
    onClose: () => void;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const router = useRouter();
    const id = useId();
    const [saving, setSaving] = useState(false);

    const save = async (file?: File): Promise<void> => {
        if (saving) return;
        setSaving(true);
        try {
            if (
                await rockIt.playlistManager.changePlaylistImage(
                    playlist.publicId,
                    file
                )
            ) {
                router.refresh();
                onClose();
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            open
            onClose={onClose}
            titleId={`${id}-title`}
            className="max-w-sm"
        >
            <div className="flex flex-col gap-4" aria-busy={saving}>
                <h2 id={`${id}-title`} className="text-base font-semibold">
                    {vocabulary.PLAYLIST_IMAGE_CHANGE}
                </h2>
                <p className="text-muted-foreground text-sm">
                    {vocabulary.PLAYLIST_IMAGE_HELP}
                </p>
                <label htmlFor={id} className="text-sm font-medium">
                    {vocabulary.PLAYLIST_IMAGE_UPLOAD}
                </label>
                <FileInput
                    id={id}
                    accept="image/jpeg,image/png,image/webp"
                    disabled={saving}
                    onChange={(event): void => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void save(file);
                    }}
                />
                <Button
                    type="button"
                    disabled={saving}
                    onClick={(): void => {
                        void save();
                    }}
                >
                    {vocabulary.PLAYLIST_IMAGE_GENERATE}
                </Button>
                {saving && (
                    <p role="status" className="text-sm">
                        {vocabulary.PLAYLIST_IMAGE_SAVING}
                    </p>
                )}
                <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={onClose}
                >
                    {vocabulary.CANCEL}
                </Button>
            </div>
        </Dialog>
    );
}
