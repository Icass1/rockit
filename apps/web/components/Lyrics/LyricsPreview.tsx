"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import type { LyricsWord } from "@/dto";
import { lyricLineFillEnd, lyricWordFill } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { lyricPlaybackTime, lyricSeekTime } from "@/lib/utils/lyricsTiming";
import { HighlightedLyricWord } from "@/components/Lyrics/HighlightedLyricWord";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export function LyricsPreview({
    mediaPublicId,
    lines,
    offset,
}: {
    mediaPublicId: string;
    lines: ReadonlyArray<{
        text: string;
        timestamp_s: number | null;
        words?: readonly LyricsWord[] | null;
        end_timestamp_s?: number | null;
    }>;
    offset: number;
}): JSX.Element {
    const vocabulary = useVocabulary();
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
        if (!element) return;
        let frame = 0;
        const tick = (): void => {
            setTime(element.currentTime);
            if (!element.paused && !element.ended)
                frame = requestAnimationFrame(tick);
        };
        const start = (): void => {
            cancelAnimationFrame(frame);
            tick();
        };
        element.addEventListener("playing", start);
        return (): void => {
            cancelAnimationFrame(frame);
            element.removeEventListener("playing", start);
            element.pause();
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
    const activeLineEnd = lyricLineFillEnd(
        lines[active]?.end_timestamp_s,
        lines.find((line, index) => index > active && line.timestamp_s !== null)
            ?.timestamp_s
    );
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
                        className={`block w-full py-1 text-left whitespace-pre-wrap ${i === active ? "text-foreground-strong" : i < active ? "text-subtle-foreground" : "text-foreground"}`}
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
                        {i === active && line.words?.length
                            ? line.words.map((word, index) => (
                                  <HighlightedLyricWord
                                      key={index}
                                      text={word.text}
                                      fill={lyricWordFill(
                                          word,
                                          time,
                                          offset,
                                          line.words?.[index + 1]
                                              ?.timestamp_s ?? activeLineEnd
                                      )}
                                  />
                              ))
                            : line.text || "…"}
                    </button>
                ))}
            </div>
        </div>
    );
}
