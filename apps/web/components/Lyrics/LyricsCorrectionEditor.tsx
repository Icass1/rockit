"use client";

import { useEffect, useId, useState, type JSX } from "react";
import type { LyricsCorrectionContextResponse } from "@/dto";
import {
    lyricsCorrectionError,
    useLyricsCorrectionDraft,
} from "@rockit/ui/headless/useLyricsCorrectionDraft";
import { Http } from "@/lib/http";
import { LyricsPreview } from "@/components/Lyrics/LyricsPreview";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";

export function LyricsCorrectionEditor({
    mediaPublicId,
}: {
    mediaPublicId: string;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const [snapshot, setSnapshot] = useState<LyricsCorrectionContextResponse>();
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let cancelled = false;
        void Http.getLyricsCorrectionContextAsync(mediaPublicId)
            .then((response) => {
                if (cancelled) return;
                if (response.isOk()) setSnapshot(response.result);
                else setFailed(true);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return (): void => {
            cancelled = true;
        };
    }, [mediaPublicId]);
    if (!snapshot)
        return (
            <p>
                {failed
                    ? vocabulary.LYRICS_UNAVAILABLE
                    : vocabulary.LYRICS_LOADING}
            </p>
        );
    if (snapshot.syncStatus === "pending")
        return <p>{vocabulary.LYRICS_SOURCE_PENDING}</p>;
    if (!snapshot.revision) return <p>{vocabulary.LYRICS_LOCAL_REQUIRED}</p>;
    return (
        <CorrectionForm
            key={snapshot.revision}
            mediaPublicId={mediaPublicId}
            snapshot={snapshot}
        />
    );
}

function CorrectionForm({
    mediaPublicId,
    snapshot,
}: {
    mediaPublicId: string;
    snapshot: LyricsCorrectionContextResponse;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const id = useId();
    const {
        offset,
        setOffset,
        lines,
        setLines,
        editLine,
        editWord,
        proposal,
        changed,
    } = useLyricsCorrectionDraft(snapshot);
    const [expanded, setExpanded] = useState<number>();
    const [pending, setPending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string>();
    const submit = async (): Promise<void> => {
        if (!proposal.success || pending || !changed) return;
        setPending(true);
        setError(undefined);
        try {
            const response = await Http.createRequest({
                mediaPublicId,
                requestType: "LYRICS",
                proposedValue: JSON.stringify(proposal.data),
                comment: null,
            });
            if (response.isOk()) setSent(true);
            else setError(lyricsCorrectionError(vocabulary, response.detail));
        } catch {
            setError(vocabulary.EDIT_METADATA_ERROR);
        } finally {
            setPending(false);
        }
    };
    return (
        <section className="border-border space-y-3 rounded-xl border p-3">
            <h3>{vocabulary.LYRICS_CORRECTION_TITLE}</h3>
            <p className="text-muted-foreground text-sm">
                {snapshot.syncStatus === "approved"
                    ? vocabulary.LYRICS_APPROVED
                    : vocabulary.LYRICS_PROVIDER_TIMING}
            </p>
            <label htmlFor={`${id}-offset`} className="block text-sm">
                {vocabulary.LYRICS_OFFSET_LABEL}
            </label>
            <NumberInput
                id={`${id}-offset`}
                min={-120}
                max={120}
                step={0.1}
                value={Number.isFinite(offset) ? offset : ""}
                onChange={(event) => setOffset(event.target.valueAsNumber)}
                className="bg-muted text-foreground-strong w-28 rounded p-2"
                disabled={pending || sent}
            />
            <p className="text-muted-foreground text-xs">
                {vocabulary.LYRICS_OFFSET_HELP}
            </p>
            <details>
                <summary>{vocabulary.LYRICS_EDIT_LINES}</summary>
                <div className="max-h-60 overflow-y-auto">
                    {lines.map((line, index) => (
                        <div
                            key={index}
                            className="border-border space-y-2 border-b py-2"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <NumberInput
                                    aria-label={`${vocabulary.LYRICS_TIME} ${index + 1}`}
                                    min={0}
                                    max={86400}
                                    step="any"
                                    value={line.timestamp_s ?? ""}
                                    disabled={
                                        pending || sent || !!line.words.length
                                    }
                                    onChange={(event) => {
                                        const timestamp_s =
                                            event.currentTarget.value === ""
                                                ? null
                                                : event.currentTarget
                                                      .valueAsNumber;
                                        editLine(index, (item) => ({
                                            ...item,
                                            timestamp_s,
                                            end_timestamp_s: null,
                                        }));
                                    }}
                                    className="w-24"
                                />
                                {line.words.length ? (
                                    <button
                                        type="button"
                                        className="min-w-0 flex-1 text-left"
                                        aria-expanded={expanded === index}
                                        aria-label={`${vocabulary.LYRICS_WORDS_EDIT} ${index + 1}`}
                                        onClick={() =>
                                            setExpanded(
                                                expanded === index
                                                    ? undefined
                                                    : index
                                            )
                                        }
                                    >
                                        <span className="block">
                                            {line.text}
                                        </span>
                                        <span className="text-primary text-xs">
                                            {vocabulary.LYRICS_WORDS_EDIT}
                                        </span>
                                    </button>
                                ) : (
                                    <Input
                                        aria-label={`${vocabulary.LYRICS_TEXT} ${index + 1}`}
                                        value={line.text}
                                        disabled={pending || sent}
                                        onChange={(event) => {
                                            const text =
                                                event.currentTarget.value;
                                            editLine(index, (item) => ({
                                                ...item,
                                                text,
                                            }));
                                        }}
                                        className="min-w-0 flex-1"
                                    />
                                )}
                                <button
                                    type="button"
                                    aria-label={vocabulary.LYRICS_REMOVE_LINE}
                                    disabled={pending || sent}
                                    className="min-h-11 min-w-11"
                                    onClick={() => {
                                        setExpanded(undefined);
                                        setLines((current) =>
                                            current.filter(
                                                (_, i) => i !== index
                                            )
                                        );
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            {expanded === index && line.words.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-muted-foreground text-xs">
                                        {vocabulary.LYRICS_WORDS_HELP}
                                    </p>
                                    {line.words.map((word, i) => (
                                        <div
                                            key={i}
                                            className="flex flex-wrap gap-2"
                                        >
                                            <Input
                                                className="min-w-24 flex-1"
                                                aria-label={`${vocabulary.LYRICS_WORD_TEXT} ${i + 1}`}
                                                value={word.text}
                                                disabled={pending || sent}
                                                onChange={(event) =>
                                                    editWord(index, i, {
                                                        text: event
                                                            .currentTarget
                                                            .value,
                                                    })
                                                }
                                            />
                                            <NumberInput
                                                className="w-24"
                                                aria-label={`${vocabulary.LYRICS_WORD_START} ${i + 1}`}
                                                min={line.timestamp_s ?? 0}
                                                step="any"
                                                value={
                                                    Number.isFinite(
                                                        word.timestamp_s
                                                    )
                                                        ? word.timestamp_s
                                                        : ""
                                                }
                                                disabled={pending || sent}
                                                onChange={(event) =>
                                                    editWord(index, i, {
                                                        timestamp_s:
                                                            event.currentTarget
                                                                .valueAsNumber,
                                                    })
                                                }
                                            />
                                            <NumberInput
                                                className="w-24"
                                                aria-label={`${vocabulary.LYRICS_WORD_END} ${i + 1}`}
                                                min={
                                                    Number.isFinite(
                                                        word.timestamp_s
                                                    )
                                                        ? word.timestamp_s
                                                        : undefined
                                                }
                                                step="any"
                                                placeholder={
                                                    vocabulary.LYRICS_WORD_END
                                                }
                                                value={
                                                    word.end_timestamp_s ?? ""
                                                }
                                                disabled={pending || sent}
                                                onChange={(event) =>
                                                    editWord(index, i, {
                                                        end_timestamp_s:
                                                            event.currentTarget
                                                                .value === ""
                                                                ? null
                                                                : event
                                                                      .currentTarget
                                                                      .valueAsNumber,
                                                    })
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    disabled={pending || sent || lines.length >= 1000}
                    onClick={() =>
                        setLines((current) => [
                            ...current,
                            {
                                text: "",
                                timestamp_s: null,
                                words: [],
                                end_timestamp_s: null,
                            },
                        ])
                    }
                >
                    {vocabulary.LYRICS_ADD_LINE}
                </button>
            </details>
            <LyricsPreview
                mediaPublicId={mediaPublicId}
                lines={lines}
                offset={Number.isFinite(offset) ? offset : snapshot.offset}
            />
            <p className="text-muted-foreground text-xs">
                {vocabulary.LYRICS_REVIEW_HELP}
            </p>
            {!proposal.success && changed && (
                <p role="alert">{vocabulary.LYRICS_INVALID_CORRECTION}</p>
            )}
            {error && (
                <p role="alert" className="text-destructive-soft">
                    {error}
                </p>
            )}
            {sent ? (
                <p role="status">{vocabulary.LYRICS_PROPOSAL_SENT}</p>
            ) : (
                <button
                    type="button"
                    disabled={!proposal.success || !changed || pending}
                    className="bg-primary-hover rounded p-2 disabled:opacity-40"
                    onClick={() => {
                        void submit();
                    }}
                >
                    {vocabulary.LYRICS_PROPOSE}
                </button>
            )}
        </section>
    );
}
