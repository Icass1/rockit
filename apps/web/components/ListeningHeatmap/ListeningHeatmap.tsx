"use client";

import { useEffect, useId, useMemo, useRef, useState, type JSX } from "react";
import type { Vocabulary } from "@rockit/shared";
import { X } from "lucide-react";
import { useListeningHeatmap } from "@/hooks/useListeningHeatmap";
import { listeningHeatmapManager } from "@/lib/managers/listeningHeatmapManager";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";
import ListeningHeatmapCurve from "@/components/ListeningHeatmap/ListeningHeatmapCurve";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

interface ListeningHeatmapProps {
    publicId?: string;
    duration: number;
    currentTime: number;
}

export default function ListeningHeatmap({
    publicId,
    duration,
    currentTime,
}: ListeningHeatmapProps): JSX.Element {
    const vocabulary = useVocabulary();
    const text = (key: keyof Vocabulary, fallback: string): string => {
        const value = vocabulary[key];
        return value && value !== key ? value : fallback;
    };
    const history = useListeningHeatmap(publicId);
    const { segments, peak, coverage } = useMemo(
        () => listeningHeatmapManager.summarize(history.segments, duration),
        [history.segments, duration]
    );
    const [open, setOpen] = useState(false);
    const id = useId();
    const container = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!open) return;
        const dismiss = (event: PointerEvent): void => {
            if (
                event.target instanceof Node &&
                !container.current?.contains(event.target)
            )
                setOpen(false);
        };
        const escape = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                setOpen(false);
                trigger.current?.focus();
            }
        };
        document.addEventListener("pointerdown", dismiss);
        document.addEventListener("keydown", escape);
        return () => {
            document.removeEventListener("pointerdown", dismiss);
            document.removeEventListener("keydown", escape);
        };
    }, [open]);
    const currentCount =
        segments.find(
            (s) =>
                s.startMs <= currentTime * 1000 && s.endMs > currentTime * 1000
        )?.count ?? 0;
    const time = (ms: number): string => getTime(ms / 1000);

    return (
        <div ref={container} className="text-foreground-strong relative w-full">
            <button
                type="button"
                ref={trigger}
                aria-label={text(
                    "LISTENING_HEATMAP_TITLE",
                    "Listening history"
                )}
                aria-expanded={open}
                aria-controls={id}
                onClick={() => setOpen(!open)}
                className="focus-visible:outline-primary block w-full cursor-pointer outline-offset-4 focus-visible:outline-2"
            >
                <ListeningHeatmapCurve
                    segments={segments}
                    duration={duration}
                    peak={peak}
                    className="h-5 w-full"
                />
            </button>
            {open && (
                <section
                    id={id}
                    aria-label={text(
                        "LISTENING_HEATMAP_TITLE",
                        "Listening history"
                    )}
                    className="border-foreground-strong/10 bg-secondary absolute inset-x-0 bottom-full z-50 mb-4 rounded-xl border p-3 shadow-2xl md:mb-14"
                >
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">
                            {text(
                                "LISTENING_HEATMAP_TITLE",
                                "Listening history"
                            )}
                        </h3>
                        <button
                            type="button"
                            aria-label={text(
                                "LISTENING_HEATMAP_CLOSE",
                                "Close listening history"
                            )}
                            onClick={() => {
                                setOpen(false);
                                trigger.current?.focus();
                            }}
                            className="text-muted-foreground hover:bg-foreground-strong/10 hover:text-foreground-strong focus-visible:outline-primary flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full outline-offset-2 focus-visible:outline-2"
                        >
                            <X size={15} />
                        </button>
                    </div>
                    {history.status === "ready" && peak > 0 ? (
                        <>
                            <div className="border-foreground-strong/10 mb-3 grid grid-cols-3 gap-3 border-b pb-2">
                                <div>
                                    <p className="text-base font-semibold tabular-nums">
                                        {peak}
                                        <span className="text-xs">×</span>
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {text(
                                            "LISTENING_HEATMAP_PEAK",
                                            "Peak listens"
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-base font-semibold tabular-nums">
                                        {coverage}
                                        <span className="text-xs">%</span>
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {text(
                                            "LISTENING_HEATMAP_EXPLORED",
                                            "Explored"
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-base font-semibold tabular-nums">
                                        {currentCount}
                                        <span className="text-xs">×</span>
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {text(
                                            "LISTENING_HEATMAP_AT",
                                            "At {time}"
                                        ).replace(
                                            "{time}",
                                            getTime(currentTime)
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div
                                className="border-foreground-strong/15 relative h-16 border-b"
                                aria-label={text(
                                    "LISTENING_HEATMAP_TIMELINE",
                                    "Replay counts across the timeline"
                                )}
                            >
                                {[0.25, 0.5, 0.75].map((value) => (
                                    <span
                                        key={value}
                                        className="border-foreground-strong/5 pointer-events-none absolute inset-x-0 border-t border-dashed"
                                        style={{ bottom: `${value * 100}%` }}
                                    />
                                ))}
                                <ListeningHeatmapCurve
                                    segments={segments}
                                    duration={duration}
                                    peak={peak}
                                    className="absolute inset-0 h-full w-full"
                                />
                                {segments.map((s) => (
                                    <button
                                        key={s.startMs}
                                        type="button"
                                        onClick={() =>
                                            rockIt.mediaPlayerManager.setCurrentTime(
                                                s.startMs / 1000
                                            )
                                        }
                                        aria-label={text(
                                            "LISTENING_HEATMAP_SEGMENT",
                                            "{start} to {end}: heard {count} times"
                                        )
                                            .replace("{start}", time(s.startMs))
                                            .replace("{end}", time(s.endMs))
                                            .replace(
                                                "{count}",
                                                String(s.count)
                                            )}
                                        className="group hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-foreground-strong absolute inset-y-0 cursor-pointer outline-offset-2 focus-visible:outline-2"
                                        style={{
                                            left: `${(s.startMs / (duration * 1000)) * 100}%`,
                                            width: `${((s.endMs - s.startMs) / (duration * 1000)) * 100}%`,
                                        }}
                                    >
                                        <span className="bg-foreground-strong text-background pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded px-2 py-1 text-xs font-semibold whitespace-nowrap group-hover:block group-focus-visible:block">
                                            {time(s.startMs)}–{time(s.endMs)} ·{" "}
                                            {s.count}×
                                        </span>
                                    </button>
                                ))}
                                <span
                                    className="bg-foreground-strong/80 pointer-events-none absolute inset-y-0 w-px"
                                    style={{
                                        left: `${Math.max(0, Math.min(100, (currentTime / duration) * 100))}%`,
                                    }}
                                >
                                    <span className="bg-foreground-strong absolute -top-1 -left-0.5 h-1.5 w-1.5 rounded-full" />
                                </span>
                            </div>
                            <div className="text-muted-foreground mt-2 flex justify-between text-xs tabular-nums">
                                <span>0:00</span>
                                <span>{getTime(duration)}</span>
                            </div>
                        </>
                    ) : (
                        <p
                            role="status"
                            className="text-muted-foreground py-5 text-sm"
                        >
                            {history.status === "loading"
                                ? text(
                                      "LISTENING_HEATMAP_LOADING",
                                      "Loading your listening history…"
                                  )
                                : history.status === "error"
                                  ? text(
                                        "LISTENING_HEATMAP_ERROR",
                                        "Listening history is unavailable. Try again when connected."
                                    )
                                  : text(
                                        "LISTENING_HEATMAP_EMPTY",
                                        "A fresh start. Listen to this media to leave your first trace."
                                    )}
                        </p>
                    )}
                </section>
            )}
        </div>
    );
}
