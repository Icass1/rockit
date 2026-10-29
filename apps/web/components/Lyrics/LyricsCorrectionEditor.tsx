"use client";

import { useEffect, useId, useState, type JSX } from "react";
import type { LyricsCorrectionContextResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { lyricsCorrectionSchema } from "@/models/schemas/lyricsCorrection";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { LyricsPreview } from "@/components/Lyrics/LyricsPreview";

export function LyricsCorrectionEditor({
    mediaPublicId,
}: {
    mediaPublicId: string;
}): JSX.Element {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
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
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const id = useId();
    const [offset, setOffset] = useState(snapshot.offset);
    const [lines, setLines] = useState(
        snapshot.lines.map((line) => ({ ...line }))
    );
    const [pending, setPending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string>();
    const proposal = lyricsCorrectionSchema.safeParse({
        kind: "lyrics_correction",
        provider: snapshot.provider,
        revision: snapshot.revision,
        offset,
        lines,
    });
    const changed =
        offset !== snapshot.offset ||
        JSON.stringify(lines) !== JSON.stringify(snapshot.lines);
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
            else
                setError(
                    typeof response.detail === "string"
                        ? response.detail
                        : vocabulary.EDIT_METADATA_ERROR
                );
        } catch {
            setError(vocabulary.EDIT_METADATA_ERROR);
        } finally {
            setPending(false);
        }
    };
    return (
        <section className="space-y-3 rounded-xl border border-neutral-700 p-3">
            <h3>{vocabulary.LYRICS_CORRECTION_TITLE}</h3>
            <p className="text-sm text-neutral-400">
                {snapshot.syncStatus === "approved"
                    ? vocabulary.LYRICS_APPROVED
                    : vocabulary.LYRICS_PROVIDER_TIMING}
            </p>
            <label htmlFor={`${id}-offset`} className="block text-sm">
                {vocabulary.LYRICS_OFFSET_LABEL}
            </label>
            <input
                id={`${id}-offset`}
                type="number"
                min={-120}
                max={120}
                step={0.1}
                value={Number.isFinite(offset) ? offset : ""}
                onChange={(event) => setOffset(event.target.valueAsNumber)}
                className="w-28 rounded bg-neutral-800 p-2 text-white"
                disabled={pending || sent}
            />
            <p className="text-xs text-neutral-400">
                {vocabulary.LYRICS_OFFSET_HELP}
            </p>
            <details>
                <summary>{vocabulary.LYRICS_EDIT_LINES}</summary>
                <div className="max-h-60 overflow-y-auto">
                    {lines.map((line, index) => (
                        <div key={index} className="my-2 flex gap-1">
                            <input
                                aria-label={`${vocabulary.LYRICS_TIME} ${index + 1}`}
                                type="number"
                                min={0}
                                max={86400}
                                step={0.01}
                                value={line.timestamp_s ?? ""}
                                disabled={pending || sent}
                                onChange={(event) =>
                                    setLines((current) =>
                                        current.map((item, i) =>
                                            i === index
                                                ? {
                                                      ...item,
                                                      timestamp_s:
                                                          event.target.value ===
                                                          ""
                                                              ? null
                                                              : event.target
                                                                    .valueAsNumber,
                                                  }
                                                : item
                                        )
                                    )
                                }
                                className="w-24 rounded bg-neutral-800 p-1"
                            />
                            <input
                                aria-label={`${vocabulary.LYRICS_TEXT} ${index + 1}`}
                                value={line.text}
                                disabled={pending || sent}
                                onChange={(event) =>
                                    setLines((current) =>
                                        current.map((item, i) =>
                                            i === index
                                                ? {
                                                      ...item,
                                                      text: event.target.value,
                                                  }
                                                : item
                                        )
                                    )
                                }
                                className="min-w-0 flex-1 rounded bg-neutral-800 p-1"
                            />
                            <button
                                type="button"
                                aria-label={vocabulary.LYRICS_REMOVE_LINE}
                                disabled={pending || sent}
                                onClick={() =>
                                    setLines((current) =>
                                        current.filter((_, i) => i !== index)
                                    )
                                }
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    disabled={pending || sent || lines.length >= 1000}
                    onClick={() =>
                        setLines((current) => [
                            ...current,
                            { text: "", timestamp_s: null },
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
            <p className="text-xs text-neutral-400">
                {vocabulary.LYRICS_REVIEW_HELP}
            </p>
            {!proposal.success && changed && (
                <p role="alert">{vocabulary.LYRICS_INVALID_CORRECTION}</p>
            )}
            {error && (
                <p role="alert" className="text-red-400">
                    {error}
                </p>
            )}
            {sent ? (
                <p role="status">{vocabulary.LYRICS_PROPOSAL_SENT}</p>
            ) : (
                <button
                    type="button"
                    disabled={!proposal.success || !changed || pending}
                    className="rounded bg-pink-600 p-2 disabled:opacity-40"
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
