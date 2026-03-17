"use client";

import { useState } from "react";
import { useStore } from "@nanostores/react";
import { Download, Loader2 } from "lucide-react";
import { rockIt } from "@/packages/lib/rockit/rockIt";
import {
    clearResources,
    downloadResources,
} from "@/packages/lib/utils/downloadResources";

export default function DownloadAppButton() {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [resources, setResources] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            await clearResources();
            await downloadResources({ setResources });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className="flex w-fit items-center gap-2 rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Download className="h-4 w-4" />
                )}
                {$vocabulary.DOWNLOAD_APP}
            </button>

            {resources.length > 0 && (
                <div className="grid grid-cols-2 gap-x-2 rounded-xl bg-neutral-800/50 p-3">
                    {resources.map((resource) => (
                        <span
                            key={resource}
                            className="w-full max-w-full min-w-0 truncate text-xs text-neutral-400"
                        >
                            {resource}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
