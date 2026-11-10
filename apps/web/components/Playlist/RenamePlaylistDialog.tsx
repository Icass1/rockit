"use client";

import { useId, useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import type { BasePlaylistWithoutMediasResponse } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";

export default function RenamePlaylistDialog({
    playlist,
    onClose,
}: {
    playlist: BasePlaylistWithoutMediasResponse;
    onClose: () => void;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const router = useRouter();
    const nameId = useId();
    const [name, setName] = useState(playlist.name);
    const [saving, setSaving] = useState(false);

    const handleSave = async (): Promise<void> => {
        if (saving || !name.trim() || name.trim() === playlist.name) return;
        setSaving(true);
        try {
            if (
                await rockIt.playlistManager.renamePlaylist(
                    playlist.publicId,
                    name
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
            titleId={`${nameId}-title`}
            className="max-w-sm"
        >
            <h2 id={`${nameId}-title`} className="mb-4 text-base font-semibold">
                {vocabulary.PLAYLIST_RENAME}
            </h2>
            <form
                className="flex flex-col gap-4"
                onSubmit={(event): void => {
                    event.preventDefault();
                    void handleSave();
                }}
            >
                <label htmlFor={nameId} className="text-sm font-medium">
                    {vocabulary.NEW_PLAYLIST_NAME}
                </label>
                <Input
                    id={nameId}
                    className="border-border-strong text-foreground-strong focus:border-foreground w-full border-b bg-transparent text-xl font-bold outline-none"
                    value={name}
                    disabled={saving}
                    onChange={(event): void => setName(event.target.value)}
                    onFocus={(event): void => event.target.select()}
                />
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        className="overlay-action border border-white/10"
                        onClick={onClose}
                    >
                        {vocabulary.CANCEL}
                    </button>
                    <button
                        type="submit"
                        className="overlay-action overlay-primary"
                        disabled={
                            saving ||
                            !name.trim() ||
                            name.trim() === playlist.name
                        }
                    >
                        {vocabulary.SAVE}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
