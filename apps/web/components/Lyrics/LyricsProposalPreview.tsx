"use client";

import { useEffect, useState, type JSX } from "react";
import type { LyricsCorrectionContextResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { lyricsCorrectionSchema } from "@/models/schemas/lyricsCorrection";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { LyricsPreview } from "@/components/Lyrics/LyricsPreview";

function LoadedProposalPreview({
    payload,
    mediaPublicId,
}: {
    payload: string;
    mediaPublicId: string;
}): JSX.Element {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [current, setCurrent] = useState<LyricsCorrectionContextResponse>();
    const [after, setAfter] = useState(true);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let cancelled = false;
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
    }, [mediaPublicId]);
    let json: unknown;
    try {
        json = JSON.parse(payload);
    } catch {
        json = null;
    }
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
                <p role="alert" className="text-amber-400">
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
            <p className="text-sm text-neutral-400">
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
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
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
