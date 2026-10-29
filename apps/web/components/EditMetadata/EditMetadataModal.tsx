"use client";

import { useState, type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import {
    getMediaArtistsString,
    getMediaSubtitle,
    isSearchResult,
    isSongWithAlbum,
    type TMediaWithSearch,
} from "@rockit/shared";
import { Loader2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { LyricsCorrectionEditor } from "@/components/Lyrics/LyricsCorrectionEditor";

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
                    value: getMediaArtistsString(media),
                    type: "text",
                },
                {
                    key: "album",
                    label: "Album",
                    value:
                        !isSearchResult(media) && isSongWithAlbum(media)
                            ? media.album.name
                            : "",
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
                    value: getMediaArtistsString(media),
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
                    value: getMediaArtistsString(media),
                    type: "text",
                },
                {
                    key: "releaseDate",
                    label: "Release date",
                    value: isSearchResult(media)
                        ? ""
                        : (media.releaseDate ?? ""),
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
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSong = media.type === "song";
    const mediaPublicId = isSearchResult(media) ? null : media.publicId;

    const handleFieldChange = (key: string, value: string): void => {
        setFields((prev) =>
            prev.map((f) => (f.key === key ? { ...f, value } : f))
        );
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

        if (!mediaPublicId) return;

        const result = await Http.createRequest({
            mediaPublicId,
            requestType: "METADATA",
            proposedValue: JSON.stringify(changes),
            comment: comment.trim() || null,
        });

        if (result.isOk()) {
            setSubmitted(true);
        } else {
            setError(
                typeof result.detail === "string"
                    ? result.detail
                    : $vocabulary.EDIT_METADATA_ERROR
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
                            {$vocabulary.EDIT_METADATA_TITLE}
                        </h2>
                        <p className="mt-0.5 text-xs text-neutral-400">
                            {$vocabulary.EDIT_METADATA_DESCRIPTION}
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
                        <Image
                            src={media.imageUrl}
                            alt={media.name}
                            width={48}
                            height={48}
                            loading="eager"
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
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
                            {$vocabulary.EDIT_METADATA_SUCCESS}
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

                        {isSong && mediaPublicId && (
                            <LyricsCorrectionEditor
                                key={mediaPublicId}
                                mediaPublicId={mediaPublicId}
                            />
                        )}

                        {/* Comment */}
                        <div>
                            <label className="mb-1 block text-xs font-medium tracking-wider text-neutral-400 uppercase">
                                {$vocabulary.EDIT_METADATA_COMMENT}
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e): void =>
                                    setComment(e.target.value)
                                }
                                placeholder={
                                    $vocabulary.EDIT_METADATA_COMMENT_PLACEHOLDER
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
                                $vocabulary.EDIT_METADATA_SUBMIT
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
