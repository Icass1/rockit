"use client";

import { useState, type JSX } from "react";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

interface DownloadInputBarProps {
    onSubmit: (url: string) => Promise<void>;
}

export default function DownloadInputBar({
    onSubmit,
}: DownloadInputBarProps): JSX.Element {
    const $vocabulary = useVocabulary();
    const [url, setUrl] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!url.trim()) return;

        setIsDownloading(true);
        setError(null);

        try {
            await onSubmit(url);
            setUrl("");
        } catch (err) {
            const message =
                err instanceof Error ? err.message : $vocabulary.ERROR;
            setError(message);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSubmit} className="min-w-0 flex-1">
                <div className="relative">
                    <input
                        type="url"
                        value={url}
                        onChange={(e): void => setUrl(e.target.value)}
                        placeholder={$vocabulary.DOWNLOAD_URL_PLACEHOLDER}
                        className="border-border-strong bg-muted/50 text-foreground-strong placeholder-muted-foreground focus:border-primary focus:ring-primary block w-full rounded-md border px-4 py-2 text-sm focus:ring-2"
                    />
                    <button
                        type="submit"
                        disabled={isDownloading}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-transparent px-2.5 text-xs font-medium disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <svg
                                className="h-4 w-4 animate-spin"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 4v5h.582m15.356 2A8.989 8.989 0 014 16a9 9 0 1012.532 8m-6.364-4.364a5.556 5.556 0 01-7.073 7.073"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        )}
                    </button>
                </div>
                {error && (
                    <p className="text-destructive-soft mt-2 text-sm">
                        {error}
                    </p>
                )}
            </form>
        </div>
    );
}
