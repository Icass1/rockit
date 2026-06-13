"use client";

import { useEffect, useState, type JSX } from "react";
import type { BaseDynamicLyricsItem } from "@/dto";
import { useStore } from "@nanostores/react";
import { getMediaSubtitle, type TMediaWithSearch } from "@rockit/shared";
import { Loader2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

interface EditMetadataModalProps {
    media: TMediaWithSearch;
    onClose: () => void;
}

interface FieldDef {
    key: string;
    label: string;
    value: string;
    type: "text" | "textarea";
}

interface LyricsLine {
    timestamp_s: number | null;
    text: string;
}

function formatTimestamp(seconds: number | null): string {
    if (seconds === null) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseTimestamp(str: string): number | null {
    const parts = str.split(":");
    if (parts.length === 2) {
        const m = parseInt(parts[0], 10);
        const s = parseInt(parts[1], 10);
        if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
    }
    return null;
}

function getOtherFields(media: TMediaWithSearch): FieldDef[] {
    switch (media.type) {
        case "song":
            return [
                {
                    key: "title",
                    label: "Title",
                    value: media.name,
                    type: "text",
                },
                {
                    key: "artist",
                    label: "Artist",
                    value: media.artists.map((a) => a.name).join(", "),
                    type: "text",
                },
                {
                    key: "album",
                    label: "Album",
                    value:
                        "album" in media && media.album ? media.album.name : "",
                    type: "text",
                },
                { key: "genre", label: "Genre", value: "", type: "text" },
            ];
        case "video":
            return [
                {
                    key: "title",
                    label: "Title",
                    value: media.name,
                    type: "text",
                },
                {
                    key: "artist",
                    label: "Artist",
                    value: media.artists.map((a) => a.name).join(", "),
                    type: "text",
                },
                { key: "genre", label: "Genre", value: "", type: "text" },
            ];
        case "album":
            return [
                {
                    key: "title",
                    label: "Name",
                    value: media.name,
                    type: "text",
                },
                {
                    key: "artist",
                    label: "Artist",
                    value: media.artists.map((a) => a.name).join(", "),
                    type: "text",
                },
                {
                    key: "releaseDate",
                    label: "Release date",
                    value:
                        "releaseDate" in media && media.releaseDate
                            ? media.releaseDate
                            : "",
                    type: "text",
                },
                { key: "genre", label: "Genre", value: "", type: "text" },
            ];
        case "artist":
            return [
                {
                    key: "title",
                    label: "Name",
                    value: media.name,
                    type: "text",
                },
                { key: "genre", label: "Genre", value: "", type: "text" },
            ];
        default:
            return [];
    }
}

export default function EditMetadataModal({
    media,
    onClose,
}: EditMetadataModalProps): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [fields, setFields] = useState<FieldDef[]>(() =>
        getOtherFields(media)
    );
    const [lyricsLines, setLyricsLines] = useState<LyricsLine[]>([]);
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSong = media.type === "song";
    const mediaPublicId = "publicId" in media ? media.publicId : null;

    useEffect(() => {
        if (!isSong || !mediaPublicId) return;

        const fetchLyrics = async (): Promise<void> => {
            setLyricsLoading(true);
            try {
                const [dynamicResult, staticResult] = await Promise.all([
                    Http.getDynamicLyricsAsync(mediaPublicId),
                    Http.getLyricsAsync(mediaPublicId),
                ]);

                if (
                    dynamicResult.isOk() &&
                    dynamicResult.result.lines.length > 0
                ) {
                    const offset = dynamicResult.result.offset || 0;
                    setLyricsLines(
                        dynamicResult.result.lines.map(
                            (line: BaseDynamicLyricsItem) => ({
                                timestamp_s: line.timestamp_s - offset,
                                text: line.text,
                            })
                        )
                    );
                } else if (
                    staticResult.isOk() &&
                    staticResult.result.lines.length > 0
                ) {
                    setLyricsLines(
                        staticResult.result.lines.map((line: string) => ({
                            timestamp_s: null,
                            text: line,
                        }))
                    );
                }
            } catch {
                // lyrics fetch failed, leave empty
            }
            setLyricsLoading(false);
        };

        fetchLyrics();
    }, [isSong, mediaPublicId]);

    const handleFieldChange = (key: string, value: string): void => {
        setFields((prev) =>
            prev.map((f) => (f.key === key ? { ...f, value } : f))
        );
    };

    const handleLyricsTextChange = (index: number, text: string): void => {
        setLyricsLines((prev) =>
            prev.map((line, i) => (i === index ? { ...line, text } : line))
        );
    };

    const handleLyricsTimestampChange = (index: number, raw: string): void => {
        setLyricsLines((prev) =>
            prev.map((line, i) =>
                i === index
                    ? { ...line, timestamp_s: parseTimestamp(raw) }
                    : line
            )
        );
    };

    const addLyricsLine = (): void => {
        setLyricsLines((prev) => [
            ...prev,
            {
                timestamp_s:
                    prev.length > 0
                        ? (prev[prev.length - 1].timestamp_s ?? 0) + 30
                        : 0,
                text: "",
            },
        ]);
    };

    const removeLyricsLine = (index: number): void => {
        setLyricsLines((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (): Promise<void> => {
        setSubmitting(true);
        setError(null);

        const changes: Record<string, string> = {};
        for (const f of fields) {
            if (f.value.trim()) {
                changes[f.key] = f.value.trim();
            }
        }

        if (lyricsLines.length > 0) {
            changes.lyrics = JSON.stringify(
                lyricsLines.map((line) => ({
                    text: line.text,
                    ...(line.timestamp_s !== null
                        ? { timestamp_s: line.timestamp_s }
                        : {}),
                }))
            );
        }

        const result = await Http.createRequest({
            mediaPublicId,
            requestType: "metadata",
            proposedValue: JSON.stringify(changes),
            comment: comment.trim() || null,
        });

        if (result.isOk()) {
            setSubmitted(true);
        } else {
            setError(
                typeof result.detail === "string"
                    ? result.detail
                    : $vocabulary.EDIT_METADATA_ERROR || "Failed to submit"
            );
        }

        setSubmitting(false);
    };

    const handleClose = (): void => {
        if (!submitting) onClose();
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={(e): void => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div className="flex max-h-[90vh] w-full flex-col rounded-2xl bg-neutral-900 p-5 md:max-h-[85vh] md:max-w-lg md:p-6">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {$vocabulary.EDIT_METADATA_TITLE || "Edit Metadata"}
                        </h2>
                        <p className="mt-0.5 text-xs text-neutral-400">
                            {$vocabulary.EDIT_METADATA_DESCRIPTION ||
                                "Suggest changes to metadata"}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={submitting}
                        className="rounded-full p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Media info */}
                <div className="mb-4 flex items-center gap-3 rounded-xl bg-neutral-800/50 p-3">
                    {media.imageUrl && (
                        <img
                            src={media.imageUrl}
                            alt={media.name}
                            className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                        />
                    )}
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                            {media.name}
                        </p>
                        <p className="truncate text-xs text-neutral-400">
                            {getMediaSubtitle(media)}
                        </p>
                    </div>
                </div>

                {submitted ? (
                    /* Success */
                    <div className="flex flex-1 flex-col items-center justify-center py-12">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                            <svg
                                className="h-8 w-8 text-emerald-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <p className="text-lg font-semibold text-white">
                            {$vocabulary.EDIT_METADATA_SUCCESS ||
                                "Suggestion submitted!"}
                        </p>
                        <p className="mt-1 text-sm text-neutral-400">
                            An admin will review your changes.
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-6 rounded-lg bg-pink-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-pink-500"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    /* Form */
                    <div className="flex-1 space-y-3 overflow-y-auto">
                        {fields.map((field) => (
                            <div key={field.key}>
                                <label className="mb-1 block text-xs font-medium tracking-wider text-neutral-400 uppercase">
                                    {field.label}
                                </label>
                                {field.type === "textarea" ? (
                                    <textarea
                                        value={field.value}
                                        onChange={(e): void =>
                                            handleFieldChange(
                                                field.key,
                                                e.target.value
                                            )
                                        }
                                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-white placeholder-neutral-500 transition outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                                        rows={4}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={field.value}
                                        onChange={(e): void =>
                                            handleFieldChange(
                                                field.key,
                                                e.target.value
                                            )
                                        }
                                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-white placeholder-neutral-500 transition outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                                    />
                                )}
                            </div>
                        ))}

                        {/* Lyrics table */}
                        {isSong && (
                            <div>
                                <label className="mb-1 block text-xs font-medium tracking-wider text-neutral-400 uppercase">
                                    Lyrics
                                </label>
                                {lyricsLoading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
                                    </div>
                                ) : (
                                    <div className="max-h-40 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-800/50 text-white">
                                        {/* Header */}
                                        <div className="flex items-center border-b border-neutral-700 px-2 py-1.5 text-xs font-medium tracking-wider text-neutral-500 uppercase">
                                            <span className="w-16 shrink-0 px-1">
                                                Time
                                            </span>
                                            <span className="flex-1 px-1">
                                                Text
                                            </span>
                                            <span className="w-8 shrink-0" />
                                        </div>

                                        {/* Rows */}
                                        {lyricsLines.length === 0 && (
                                            <p className="px-3 py-4 text-center text-xs text-neutral-500">
                                                No lyrics found. Add some below.
                                            </p>
                                        )}
                                        {lyricsLines.map((line, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-1 border-b border-neutral-700/50 px-2 py-1 last:border-b-0"
                                            >
                                                <input
                                                    type="text"
                                                    value={formatTimestamp(
                                                        line.timestamp_s
                                                    )}
                                                    onChange={(e): void =>
                                                        handleLyricsTimestampChange(
                                                            i,
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="m:ss"
                                                    className="w-16 shrink-0 rounded bg-neutral-800 px-1.5 py-1 text-center text-xs text-neutral-300 outline-none focus:bg-neutral-700"
                                                />
                                                <input
                                                    type="text"
                                                    value={line.text}
                                                    onChange={(e): void =>
                                                        handleLyricsTextChange(
                                                            i,
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Lyrics text"
                                                    className="flex-1 rounded bg-neutral-800 px-2 py-1 text-sm text-white outline-none focus:bg-neutral-700"
                                                />
                                                <button
                                                    onClick={(): void =>
                                                        removeLyricsLine(i)
                                                    }
                                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-red-500/20 hover:text-red-400"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}

                                        {/* Add line button */}
                                        <button
                                            onClick={addLyricsLine}
                                            className="flex w-full items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-neutral-400 transition hover:bg-neutral-700/50 hover:text-white"
                                        >
                                            + Add line
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Comment */}
                        <div>
                            <label className="mb-1 block text-xs font-medium tracking-wider text-neutral-400 uppercase">
                                {$vocabulary.EDIT_METADATA_COMMENT || "Comment"}
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e): void =>
                                    setComment(e.target.value)
                                }
                                placeholder={
                                    $vocabulary.EDIT_METADATA_COMMENT_PLACEHOLDER ||
                                    "Optional: explain why these changes are needed"
                                }
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-white placeholder-neutral-500 transition outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                                rows={2}
                            />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

                {/* Footer */}
                {!submitted && (
                    <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                            onClick={handleClose}
                            disabled={submitting}
                            className="rounded-md border border-neutral-600 px-3 py-2 text-sm whitespace-nowrap text-neutral-300 transition hover:border-neutral-400 hover:text-white disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-1.5 rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                $vocabulary.EDIT_METADATA_SUBMIT ||
                                "Submit Suggestion"
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
