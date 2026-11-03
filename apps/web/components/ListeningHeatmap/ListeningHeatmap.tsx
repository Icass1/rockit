"use client";

import { useEffect, useId, useMemo, useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import type { Vocabulary } from "@rockit/shared";
import { Activity, ChevronDown, X } from "lucide-react";
import { useListeningHeatmap } from "@/hooks/useListeningHeatmap";
import { listeningHeatmapManager } from "@/lib/managers/listeningHeatmapManager";
import { rockIt } from "@/lib/rockit/rockIt";
import { getTime } from "@/lib/utils/getTime";

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
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
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
        <div ref={container} className="relative w-full text-white">
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
                className="group flex w-full cursor-pointer items-end gap-2 rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-(--rockit-pink)"
            >
                <Activity
                    size={12}
                    className="mb-0.5 shrink-0 text-neutral-400 group-hover:text-white"
                />
                <span
                    className="relative block h-5 flex-1 overflow-hidden rounded-t-sm"
                    aria-hidden="true"
                >
                    <span className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
                    {segments.map((s) => (
                        <span
                            key={s.startMs}
                            className="absolute bottom-0 rounded-t-[2px] motion-safe:transition-[height] motion-safe:duration-300"
                            style={{
                                left: `${(s.startMs / (duration * 1000)) * 100}%`,
                                width: `${((s.endMs - s.startMs) / (duration * 1000)) * 100}%`,
                                height: `${4 + (s.count / peak) * 16}px`,
                                backgroundColor: "var(--rockit-pink)",
                                opacity: 0.35 + (s.count / peak) * 0.65,
                            }}
                        />
                    ))}
                </span>
                <span className="mb-0.5 shrink-0 text-[10px] font-medium text-neutral-400 tabular-nums group-hover:text-white">
                    {history.status === "loading"
                        ? "…"
                        : history.status === "error"
                          ? text("LISTENING_HEATMAP_UNAVAILABLE", "Unavailable")
                          : `${peak}×`}
                </span>
                <ChevronDown
                    size={10}
                    className={`mb-1 text-neutral-400 motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>
            {open && (
                <section
                    id={id}
                    aria-label={text(
                        "LISTENING_HEATMAP_TITLE",
                        "Listening history"
                    )}
                    className="absolute inset-x-0 bottom-full z-50 mb-4 rounded-xl border border-white/10 bg-neutral-900 p-4 shadow-2xl md:mb-14"
                >
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold">
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
                            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-400 outline-offset-2 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-(--rockit-pink)"
                        >
                            <X size={15} />
                        </button>
                    </div>
                    {history.status === "ready" && peak > 0 ? (
                        <>
                            <div className="mb-5 grid grid-cols-3 gap-3 border-b border-white/10 pb-4">
                                <div>
                                    <p className="text-xl font-semibold tabular-nums">
                                        {peak}
                                        <span className="text-xs">×</span>
                                    </p>
                                    <p className="mt-1 text-xs text-neutral-400">
                                        {text(
                                            "LISTENING_HEATMAP_PEAK",
                                            "Peak listens"
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xl font-semibold tabular-nums">
                                        {coverage}
                                        <span className="text-xs">%</span>
                                    </p>
                                    <p className="mt-1 text-xs text-neutral-400">
                                        {text(
                                            "LISTENING_HEATMAP_EXPLORED",
                                            "Explored"
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xl font-semibold tabular-nums">
                                        {currentCount}
                                        <span className="text-xs">×</span>
                                    </p>
                                    <p className="mt-1 text-xs text-neutral-400">
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
                                className="relative h-20 border-b border-white/15"
                                aria-label={text(
                                    "LISTENING_HEATMAP_TIMELINE",
                                    "Replay counts across the timeline"
                                )}
                            >
                                {[0.25, 0.5, 0.75].map((value) => (
                                    <span
                                        key={value}
                                        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/5"
                                        style={{ bottom: `${value * 100}%` }}
                                    />
                                ))}
                                {segments.map((s) => (
                                    <button
                                        key={s.startMs}
                                        type="button"
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
                                        className="group absolute bottom-0 rounded-t-sm border-r border-neutral-900/40 bg-(--rockit-pink) outline-offset-2 hover:brightness-125 focus-visible:outline-2 focus-visible:outline-white focus-visible:brightness-125"
                                        style={{
                                            left: `${(s.startMs / (duration * 1000)) * 100}%`,
                                            width: `${((s.endMs - s.startMs) / (duration * 1000)) * 100}%`,
                                            height: `${Math.max(8, (s.count / peak) * 100)}%`,
                                            opacity:
                                                0.35 + (s.count / peak) * 0.65,
                                        }}
                                    >
                                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded bg-white px-2 py-1 text-xs font-semibold whitespace-nowrap text-black group-hover:block group-focus-visible:block">
                                            {time(s.startMs)}–{time(s.endMs)} ·{" "}
                                            {s.count}×
                                        </span>
                                    </button>
                                ))}
                                <span
                                    className="pointer-events-none absolute inset-y-0 w-px bg-white/80"
                                    style={{
                                        left: `${Math.max(0, Math.min(100, (currentTime / duration) * 100))}%`,
                                    }}
                                >
                                    <span className="absolute -top-1 -left-0.5 h-1.5 w-1.5 rounded-full bg-white" />
                                </span>
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-neutral-400 tabular-nums">
                                <span>0:00</span>
                                <span>{getTime(duration)}</span>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-neutral-400">
                                <span>
                                    {text(
                                        "LISTENING_HEATMAP_CAPTION",
                                        "Each moment, counted across all listens"
                                    )}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    {text("LISTENING_HEATMAP_LESS", "Less")}{" "}
                                    <span
                                        className="flex gap-0.5"
                                        aria-hidden="true"
                                    >
                                        {[0.35, 0.55, 0.75, 1].map(
                                            (opacity) => (
                                                <span
                                                    key={opacity}
                                                    className="h-2 w-2 rounded-sm bg-(--rockit-pink)"
                                                    style={{ opacity }}
                                                />
                                            )
                                        )}
                                    </span>{" "}
                                    {text("LISTENING_HEATMAP_MORE", "More")}
                                </span>
                            </div>
                        </>
                    ) : (
                        <p
                            role="status"
                            className="py-5 text-sm text-neutral-400"
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
