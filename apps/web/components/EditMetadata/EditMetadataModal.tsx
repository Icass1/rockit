"use client";

import { useState, type JSX } from "react";
import Image from "next/image";
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
import { LyricsCorrectionEditor } from "@/components/Lyrics/LyricsCorrectionEditor";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

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
    const $vocabulary = useVocabulary();
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
            className="bg-backdrop/80 fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e): void => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div className="bg-secondary flex max-h-[90vh] w-full flex-col rounded-2xl p-5 md:max-h-[85vh] md:max-w-lg md:p-6">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-foreground-strong text-xl font-bold">
                            {$vocabulary.EDIT_METADATA_TITLE}
                        </h2>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                            {$vocabulary.EDIT_METADATA_DESCRIPTION}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={submitting}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground-strong rounded-full p-2 transition disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Media info */}
                <div className="bg-muted/50 mb-4 flex items-center gap-3 rounded-xl p-3">
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
                        <p className="text-foreground-strong truncate text-sm font-semibold">
                            {media.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                            {getMediaSubtitle(media)}
                        </p>
                    </div>
                </div>

                {submitted ? (
                    /* Success */
                    <div className="flex flex-1 flex-col items-center justify-center py-12">
                        <div className="bg-success/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                            <svg
                                className="text-success-foreground h-8 w-8"
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
                        <p className="text-foreground-strong text-lg font-semibold">
                            {$vocabulary.EDIT_METADATA_SUCCESS}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                            An admin will review your changes.
                        </p>
                        <button
                            onClick={onClose}
                            className="bg-primary-hover text-primary-foreground hover:bg-primary hover:text-primary-foreground mt-6 rounded-lg px-6 py-2 text-sm font-semibold transition"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    /* Form */
                    <div className="flex-1 space-y-3 overflow-y-auto">
                        {fields.map((field) => (
                            <div key={field.key}>
                                <label className="text-muted-foreground mb-1 block text-xs font-medium tracking-wider uppercase">
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
                                        className="border-border bg-muted text-foreground-strong placeholder-subtle-foreground focus:border-primary focus:ring-primary w-full rounded-lg border p-3 text-sm transition outline-none focus:ring-1"
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
                                        className="border-border bg-muted text-foreground-strong placeholder-subtle-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-3 py-2.5 text-sm transition outline-none focus:ring-1"
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
                            <label className="text-muted-foreground mb-1 block text-xs font-medium tracking-wider uppercase">
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
                                className="border-border bg-muted text-foreground-strong placeholder-subtle-foreground focus:border-primary focus:ring-primary w-full rounded-lg border p-3 text-sm transition outline-none focus:ring-1"
                                rows={2}
                            />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p className="text-destructive-soft mt-3 text-sm">
                        {error}
                    </p>
                )}

                {/* Footer */}
                {!submitted && (
                    <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                            onClick={handleClose}
                            disabled={submitting}
                            className="border-border-strong text-foreground hover:border-border-strong hover:text-foreground-strong rounded-md border px-3 py-2 text-sm whitespace-nowrap transition disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-primary-hover text-primary-foreground hover:bg-primary hover:text-primary-foreground flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-40"
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
