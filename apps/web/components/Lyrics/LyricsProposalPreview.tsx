"use client";

import { useEffect, useState, type JSX } from "react";
import {
    StoredLyricsSourceSchema,
    type LyricsCorrectionContextResponse,
} from "@/dto";
import { lyricsCorrectionSchema } from "@/models/schemas/lyricsCorrection";
import { Http } from "@/lib/http";
import { LyricsPreview } from "@/components/Lyrics/LyricsPreview";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

function LoadedProposalPreview({
    payload,
    mediaPublicId,
}: {
    payload: string;
    mediaPublicId: string;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const [current, setCurrent] = useState<LyricsCorrectionContextResponse>();
    const [after, setAfter] = useState(true);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let cancelled = false;
        let parsed: unknown;
        try {
            parsed = JSON.parse(payload);
        } catch {
            parsed = null;
        }
        if (StoredLyricsSourceSchema.safeParse(parsed).success) return;
        void Http.getLyricsCorrectionContextAsync(mediaPublicId)
            .then((result) => {
                if (cancelled) return;
                if (result.isOk()) setCurrent(result.result);
                else setFailed(true);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return (): void => {
            cancelled = true;
        };
    }, [mediaPublicId, payload]);
    let json: unknown;
    try {
        json = JSON.parse(payload);
    } catch {
        json = null;
    }
    const source = StoredLyricsSourceSchema.safeParse(json);
    if (source.success)
        return (
            <div className="space-y-3">
                <p className="text-muted-foreground text-xs">
                    {vocabulary.LYRICS_SOURCE_RECORDING}
                </p>
                <p className="font-semibold">{source.data.trackName}</p>
                <p className="text-muted-foreground text-sm">
                    {source.data.artistName} · {source.data.albumName}
                </p>
                <a
                    className="text-primary inline-flex min-h-11 items-center text-sm underline"
                    href={`https://lrclib.net/api/get/${source.data.sourceId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {vocabulary.LYRICS_SOURCE_OPEN} · {source.data.sourceId}
                </a>
                <LyricsPreview
                    mediaPublicId={mediaPublicId}
                    lines={source.data.lines}
                    offset={source.data.offset}
                />
                <p className="text-muted-foreground text-xs">
                    {vocabulary.LYRICS_SOURCE_REVIEW}
                </p>
            </div>
        );
    const proposal = lyricsCorrectionSchema.safeParse(json);
    if (!proposal.success) return <p>{vocabulary.LYRICS_LEGACY_PROPOSAL}</p>;
    if (!current)
        return (
            <p>
                {failed
                    ? vocabulary.LYRICS_UNAVAILABLE
                    : vocabulary.LYRICS_LOADING}
            </p>
        );
    const stale = current.revision !== proposal.data.revision;
    return (
        <div className="space-y-2">
            {stale && (
                <p role="alert" className="text-warning">
                    {vocabulary.LYRICS_STALE_PROPOSAL}
                </p>
            )}
            <button
                type="button"
                className="rounded border p-2"
                onClick={() => setAfter((value) => !value)}
            >
                {after
                    ? vocabulary.LYRICS_SHOW_CURRENT
                    : vocabulary.LYRICS_SHOW_PROPOSED}
            </button>
            <p>
                {vocabulary.LYRICS_OFFSET_LABEL}:{" "}
                {after ? proposal.data.offset : current.offset}
            </p>
            <LyricsPreview
                mediaPublicId={mediaPublicId}
                lines={after ? proposal.data.lines : current.lines}
                offset={after ? proposal.data.offset : current.offset}
            />
            <p className="text-muted-foreground text-sm">
                {vocabulary.LYRICS_REVIEW_HELP}
            </p>
        </div>
    );
}

export function LyricsProposalPreview({
    payload,
    mediaPublicId,
}: {
    payload: string;
    mediaPublicId: string;
}): JSX.Element {
    const vocabulary = useVocabulary();
    const [open, setOpen] = useState(false);
    return (
        <details onToggle={(event) => setOpen(event.currentTarget.open)}>
            <summary>{vocabulary.LYRICS_PREVIEW}</summary>
            {open && (
                <LoadedProposalPreview
                    payload={payload}
                    mediaPublicId={mediaPublicId}
                />
            )}
        </details>
    );
}
