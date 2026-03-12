"use client";

import { useState } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import DownloadInputBar from "@/components/Downloader/DownloadInputBar";
import DownloadLiveFeed, {
    useDownloadGroups,
} from "@/components/Downloader/DownloadLiveFeed";

// ─── Donut chart ──────────────────────────────────────────────────────────────

const RADIUS = 36;
const CIRC = 2 * Math.PI * RADIUS;

interface DonutSegment {
    value: number;
    color: string;
    label: string;
    textColor: string;
}

function DonutChart({
    segments,
    total,
}: {
    segments: DonutSegment[];
    total: number;
}) {
    const [expanded, setExpanded] = useState(false);

    let offset = 0;
    const arcs = segments
        .filter((s) => s.value > 0)
        .map((s) => {
            const pct = total > 0 ? s.value / total : 0;
            const dash = pct * CIRC;
            const gap = CIRC - dash;
            const arc = { ...s, dash, gap, offset: offset * CIRC };
            offset += pct;
            return arc;
        });

    // If nothing, show empty ring
    if (total === 0) {
        arcs.push({
            value: 0,
            color: "#262626",
            label: "",
            textColor: "",
            dash: CIRC,
            gap: 0,
            offset: 0,
        });
    }

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Donut */}
            <button
                type="button"
                aria-label={expanded ? "Collapse stats" : "Expand stats"}
                onClick={() => setExpanded((e) => !e)}
                className="group relative flex h-24 w-24 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
            >
                <svg
                    width="96"
                    height="96"
                    viewBox="0 0 96 96"
                    className="-rotate-90"
                >
                    {total === 0 ? (
                        <circle
                            cx="48"
                            cy="48"
                            r={RADIUS}
                            fill="none"
                            stroke="#262626"
                            strokeWidth="10"
                        />
                    ) : (
                        arcs.map((arc, i) => (
                            <circle
                                key={i}
                                cx="48"
                                cy="48"
                                r={RADIUS}
                                fill="none"
                                stroke={arc.color}
                                strokeWidth="10"
                                strokeDasharray={`${arc.dash} ${arc.gap}`}
                                strokeDashoffset={-arc.offset}
                                strokeLinecap="butt"
                                className="transition-all duration-700"
                            />
                        ))
                    )}
                </svg>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums leading-none text-white">
                        {total}
                    </span>
                    <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-neutral-500">
                        total
                    </span>
                </div>
            </button>

            {/* Expanded legend */}
            {expanded && (
                <div className="flex w-full flex-col gap-1.5">
                    {segments.map((s) => (
                        <div
                            key={s.label}
                            className="flex items-center justify-between gap-2 rounded-lg bg-neutral-800/50 px-3 py-2"
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: s.color }}
                                />
                                <span className="text-xs font-medium text-neutral-400">
                                    {s.label}
                                </span>
                            </div>
                            <span
                                className={`text-sm font-bold tabular-nums ${s.textColor}`}
                            >
                                {s.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Stats pills (mobile) ─────────────────────────────────────────────────────

function StatsPills({
    total,
    active,
    done,
    failed,
}: {
    total: number;
    active: number;
    done: number;
    failed: number;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-bold tabular-nums text-white">
                {total} total
            </span>
            {active > 0 && (
                <span className="rounded-full bg-[#ee1086]/15 px-3 py-1 text-xs font-bold tabular-nums text-[#ee1086]">
                    {active} active
                </span>
            )}
            {done > 0 && (
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold tabular-nums text-emerald-400">
                    {done} done
                </span>
            )}
            {failed > 0 && (
                <span className="rounded-full bg-red-400/15 px-3 py-1 text-xs font-bold tabular-nums text-red-400">
                    {failed} failed
                </span>
            )}
        </div>
    );
}

// ─── Clear button ─────────────────────────────────────────────────────────────

function ClearButton() {
    const $downloads = useStore(rockIt.downloaderManager.downloadInfoAtom);
    const hasCompleted = $downloads.some((d) => d.completed === 100);
    if (!hasCompleted) return null;

    return (
        <button
            type="button"
            className="text-xs text-neutral-600 transition-colors hover:text-neutral-300"
            onClick={() => rockIt.downloaderManager.clearCompleted?.()}
        >
            Clear completed
        </button>
    );
}

// ─── Sidebar (desktop only) ───────────────────────────────────────────────────

function DesktopSidebar() {
    const { total, active, completed, failed } = useDownloadGroups();

    const segments: DonutSegment[] = [
        {
            value: active.length,
            color: "#ee1086",
            label: "Active",
            textColor: "text-[#ee1086]",
        },
        {
            value: completed.length,
            color: "#1cad60",
            label: "Done",
            textColor: "text-green-500",
        },
        {
            value: failed.length,
            color: "#c72e2e",
            label: "Failed",
            textColor: "text-red-600",
        },
    ];

    return (
        <aside className="hidden w-56 shrink-0 flex-col gap-6 md:flex">
            {/* Stat card */}
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-800/50 bg-neutral-900/70 p-5">
                <p className="self-start text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                    Stats
                </p>
                <DonutChart segments={segments} total={total} />
                {total === 0 && (
                    <p className="text-center text-xs leading-relaxed text-neutral-600">
                        Start a download to see stats
                    </p>
                )}
            </div>

            {/* Sources card */}
            <div className="rounded-2xl border border-neutral-800/50 bg-neutral-900/70 p-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                    Sources
                </p>
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5">
                        <Image
                            width={16}
                            height={16}
                            src="/youtube-music-logo.svg"
                            alt="YouTube Music"
                            className="h-4 w-4 object-contain opacity-60"
                        />
                        <span className="text-xs text-neutral-400">
                            YouTube Music
                        </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Image
                            width={16}
                            height={16}
                            src="/spotify-logo.png"
                            alt="Spotify"
                            className="h-4 w-4 object-contain opacity-60"
                        />
                        <span className="text-xs text-neutral-400">
                            Spotify
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function DownloaderClient() {
    const { total, active, completed, failed, $downloads } =
        useDownloadGroups();

    return (
        <div className="h-full w-full overflow-y-auto pb-20 pt-24">
            <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
                {/* Header */}
                <div className="mb-2 flex w-full flex-col items-center justify-center gap-4 text-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Downloader
                        </h1>
                        <p className="mt-0.5 text-sm text-neutral-500">
                            Paste a Spotify or YouTube URL
                        </p>
                    </div>
                </div>

                {/* Input */}
                <div className="mb-10 py-1">
                    <DownloadInputBar />
                </div>

                {/* Mobile stats pills */}
                {$downloads.length > 0 && (
                    <div className="mb-4 md:hidden">
                        <StatsPills
                            total={total}
                            active={active.length}
                            done={completed.length}
                            failed={failed.length}
                        />
                    </div>
                )}

                {/* Main 2-col layout */}
                <div className="flex items-start gap-6">
                    {/* Feed — takes remaining space */}
                    <div className="min-w-0 flex-1">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                Downloads
                            </h2>
                            <ClearButton />
                        </div>
                        <DownloadLiveFeed />
                    </div>

                    {/* Sidebar — only desktop */}
                    <DesktopSidebar />
                </div>

                <div className="h-10" />
            </div>
        </div>
    );
}
