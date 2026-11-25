"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import type { LyricsWord } from "@/dto";
import { lyricWordState } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { lyricPlaybackTime, lyricSeekTime } from "@/lib/utils/lyricsTiming";
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
                        className={`block w-full py-1 text-left whitespace-pre-wrap ${i === active ? "text-primary-soft" : "text-foreground"}`}
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
                            ? line.words.map((word, index) => {
                                  const state = lyricWordState(
                                      word,
                                      time,
                                      offset,
                                      line.words?.[index + 1]?.timestamp_s ??
                                          line.end_timestamp_s
                                  );
                                  return (
                                      <span
                                          key={index}
                                          className={
                                              state === "active"
                                                  ? "text-primary font-semibold"
                                                  : state === "past"
                                                    ? "text-foreground-strong"
                                                    : "text-muted-foreground"
                                          }
                                      >
                                          {word.text}
                                      </span>
                                  );
                              })
                            : line.text || "…"}
                    </button>
                ))}
            </div>
        </div>
    );
}
