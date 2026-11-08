"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { BaseLyricsResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { useLyricAutoScroll } from "@/hooks/useLyricAutoScroll";
import { useLyricsSnapshot } from "@/hooks/useLyricsSnapshot";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { lyricPlaybackTime, lyricSeekTime } from "@/lib/utils/lyricsTiming";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import ProviderTag from "@/components/ProviderTag/ProviderTag";

export default function PlayerUILyrics(): JSX.Element {
    const [lyricsTab] = useState<"STATIC" | "DYNAMIC">("DYNAMIC");
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);

    return (
        <div className="relative h-full min-h-0 w-full min-w-0">
            {lyricsTab === "STATIC" ? (
                <Lyrics key={$currentMedia?.publicId}></Lyrics>
            ) : (
                <DynamicLyrics key={$currentMedia?.publicId}></DynamicLyrics>
            )}
        </div>
    );
}

function Lyrics(): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);

    const [lyrics, setLyrics] = useState<BaseLyricsResponse>();

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLyrics(undefined);
        if ($currentMedia?.type !== "song") return;
        let cancelled = false;

        Http.getLyricsAsync($currentMedia.publicId).then((response) => {
            if (!cancelled && response.isOk()) {
                setLyrics(response.result);
            }
        });
        return (): void => {
            cancelled = true;
        };
    }, [$currentMedia]);

    return (
        <div className="scrollbar-none overflow-y-auto scroll-smooth pl-7">
            {lyrics?.lines.map((line, index) => (
                <p
                    key={index}
                    className="max-w-full px-4 py-2 text-lg [overflow-wrap:anywhere]"
                >
                    {line}
                </p>
            ))}
        </div>
    );
}

function DynamicLyrics(): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const $vocabulary = useVocabulary();

    const snapshot = useLyricsSnapshot(
        $currentMedia?.type === "song" ? $currentMedia.publicId : undefined
    );
    const lyrics = snapshot.data?.dynamic;
    const loading = snapshot.loading;

    const currentIndex = useMemo(() => {
        if (!lyrics || $currentTime === null || $currentTime === undefined)
            return null;

        const offset = lyrics.offset;

        for (let i = lyrics.lines.length - 1; i >= 0; i--) {
            if (
                $currentTime >=
                lyricPlaybackTime(lyrics.lines[i].timestamp_s, offset)
            ) {
                return i;
            }
        }

        return null;
    }, [lyrics, $currentTime]);

    const containerRef = useRef<HTMLDivElement>(null);

    useLyricAutoScroll(
        containerRef,
        currentIndex === null ? null : `[data-lyric-index="${currentIndex}"]`
    );

    const goToLine = (index: number): void => {
        if (!lyrics) return;
        const timeStamp = lyrics.lines[index].timestamp_s;
        if (timeStamp !== undefined) {
            rockIt.mediaPlayerManager.setCurrentTime(
                lyricSeekTime(timeStamp, lyrics.offset)
            );
        }
    };

    if (loading) {
        return (
            <div className="flex h-full w-full animate-pulse items-center justify-center">
                <p className="text-muted-foreground text-lg">
                    {$vocabulary.LYRICS_LOADING}
                </p>
            </div>
        );
    }

    if (!lyrics) {
        return (
            <div className="scrollbar-none h-full overflow-y-auto pl-7">
                {snapshot.data?.lines.map((line, index) => (
                    <p
                        key={index}
                        className="max-w-full px-4 py-2 text-lg [overflow-wrap:anywhere]"
                    >
                        {line.text}
                    </p>
                ))}
                {!snapshot.data?.lines.length && (
                    <p>{$vocabulary.LYRICS_UNAVAILABLE}</p>
                )}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="player-lyrics-scroll scrollbar-none relative h-full min-h-0 w-full min-w-0 overflow-x-hidden overflow-y-auto pb-24 pl-4"
        >
            {lyrics?.lines.map((line, index) => (
                <p
                    onClick={() => goToLine(index)}
                    key={index}
                    className={`player-lyric-line cursor-pointer px-4 py-2 font-semibold text-balance ${
                        currentIndex === index
                            ? "player-lyric-line--current text-foreground-strong"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-lyric-index={index}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            goToLine(index);
                        }
                    }}
                    id={`dynamic-lyric-line-${index}`}
                >
                    {line.text}
                </p>
            ))}
            <div className="mt-24 flex flex-col items-center gap-4">
                <div className="flex flex-row items-center gap-4">
                    <label className="text-lg font-semibold">
                        {$vocabulary.LYRICS_BY}
                    </label>
                    {lyrics?.provider && (
                        <ProviderTag
                            className="h-10 w-10"
                            name={lyrics?.provider}
                        />
                    )}
                </div>
                <p className="text-muted-foreground text-xs">
                    {lyrics?.publicId}
                </p>
            </div>
        </div>
    );
}
