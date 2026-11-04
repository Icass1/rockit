"use client";

import { useState, type JSX } from "react";
import { useSettingsFeedback } from "@/hooks/useSettingsFeedback";
import { rockIt } from "@/lib/rockit/rockIt";
import { useSession } from "@/components/providers/SessionProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function DownloadLibrarySetting(): JSX.Element {
    const session = useSession();
    const vocabulary = useVocabulary();
    const notifySaved = useSettingsFeedback();
    const [saving, setSaving] = useState(false);
    const change = async (autoAddToLibrary: boolean): Promise<void> => {
        setSaving(true);
        try {
            if (
                await rockIt.userManager.setDownloadAutoAddToLibraryAsync(
                    autoAddToLibrary
                )
            )
                notifySaved();
        } finally {
            setSaving(false);
        }
    };
    return (
        <div className="text-sm text-neutral-300" aria-busy={saving}>
            <label
                htmlFor="download-auto-library"
                className="flex items-center gap-2"
            >
                <input
                    id="download-auto-library"
                    type="checkbox"
                    checked={session?.autoAddToLibrary ?? false}
                    disabled={!session || saving}
                    onChange={(event) => void change(event.target.checked)}
                />
                {vocabulary.DOWNLOADER_AUTO_LIBRARY}
                {saving && <span role="status">{vocabulary.SAVING}</span>}
            </label>
        </div>
    );
}
