"use client";

import { useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export default function DownloadLibrarySetting(): JSX.Element {
    const { data, loading, error, update } = useFetch(Http.getDownloadSettings);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [saving, setSaving] = useState(false);
    const change = async (autoAddToLibrary: boolean): Promise<void> => {
        setSaving(true);
        try {
            const result = await Http.updateDownloadSettings({
                autoAddToLibrary,
            });
            if (!result.isOk()) throw new Error(result.message);
            update();
        } catch (error) {
            rockIt.notificationManager.notifyError(
                error instanceof Error ? error.message : vocabulary.ERROR
            );
        } finally {
            setSaving(false);
        }
    };
    return (
        <div className="text-sm text-neutral-300" aria-busy={loading || saving}>
            <label
                htmlFor="download-auto-library"
                className="flex items-center gap-2"
            >
                <input
                    id="download-auto-library"
                    type="checkbox"
                    checked={data?.autoAddToLibrary ?? false}
                    disabled={loading || saving || !!error}
                    onChange={(event) => void change(event.target.checked)}
                />
                {vocabulary.DOWNLOADER_AUTO_LIBRARY}
                {saving && <span role="status">{vocabulary.SAVING}</span>}
            </label>
            {error && (
                <button className="text-red-400" onClick={update}>
                    {vocabulary.RETRY}
                </button>
            )}
        </div>
    );
}
