"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import type { LyricsSnapshot } from "@/models/interfaces/lyricsSnapshot";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { lyricPlaybackTime, lyricSeekTime } from "@/lib/utils/lyricsTiming";

export function LyricsPreview({
    mediaPublicId,
    lines,
    offset,
}: {
    mediaPublicId: string;
    lines: LyricsSnapshot["lines"];
    offset: number;
}): JSX.Element {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const audio = useRef<HTMLAudioElement>(null);
    const [url, setUrl] = useState<string>();
    const [time, setTime] = useState(0);
    const [unavailable, setUnavailable] = useState(false);
    useEffect(() => {
        let cancelled = false;
        void Http.getSong(mediaPublicId)
            .then((result) => {
                if (cancelled) return;
                if (result.isOk() && result.result.audioUrl)
                    setUrl(result.result.audioUrl);
                else setUnavailable(true);
            })
            .catch(() => {
                if (!cancelled) setUnavailable(true);
            });
        return (): void => {
            cancelled = true;
        };
    }, [mediaPublicId]);
    useEffect(() => {
        const element = audio.current;
        return (): void => {
            element?.pause();
        };
    }, [url]);
    let active = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
        const timestamp = lines[i].timestamp_s;
        if (
            timestamp !== null &&
            time >= lyricPlaybackTime(timestamp, offset)
        ) {
            active = i;
            break;
        }
    }
    return (
        <div className="space-y-2">
            {url && (
                <audio
                    ref={audio}
                    aria-label={vocabulary.LYRICS_PREVIEW}
                    src={url}
                    controls
                    preload="none"
                    onPlay={() => {
                        rockIt.mediaPlayerManager.pause();
                    }}
                    onTimeUpdate={() =>
                        setTime(audio.current?.currentTime ?? 0)
                    }
                />
            )}
            {unavailable && <p>{vocabulary.LYRICS_PREVIEW_UNAVAILABLE}</p>}
            <div className="max-h-40 overflow-y-auto">
                {lines.map((line, i) => (
                    <button
                        key={i}
                        type="button"
                        disabled={line.timestamp_s === null || !url}
                        className={`block w-full py-1 text-left ${i === active ? "text-pink-400" : "text-neutral-300"}`}
                        onClick={() => {
                            if (audio.current && line.timestamp_s !== null) {
                                const target = lyricSeekTime(
                                    line.timestamp_s,
                                    offset
                                );
                                audio.current.currentTime = Number.isFinite(
                                    audio.current.duration
                                )
                                    ? Math.min(target, audio.current.duration)
                                    : target;
                            }
                        }}
                    >
                        {line.text || "…"}
                    </button>
                ))}
            </div>
        </div>
    );
}
