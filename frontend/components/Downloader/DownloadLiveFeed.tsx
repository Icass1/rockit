"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import type { DownloadInfo } from "@/types/rockIt";
import { BaseSongWithAlbumResponse } from "@/dto";

// ─── Single media item ────────────────────────────────────────────────────────

interface MediaMeta {
    name: string;
    imageUrl: string;
}

function useMediaMeta(publicId: string): MediaMeta | null {
    const [meta, setMeta] = useState<MediaMeta | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch(`song/${publicId}?q=name,image,albumName,albumId`)
            .then((r) => r.json())
            .then((data: BaseSongWithAlbumResponse) => {
                if (cancelled) return;
                setMeta({
                    name: data.name,
                    imageUrl:
                        data.album?.internalImageUrl ??
                        rockIt.SONG_PLACEHOLDER_IMAGE_URL,
                });
            })
            .catch(() => {
                /* meta stays null → skeleton stays visible */
            });
        return () => {
            cancelled = true;
        };
    }, [publicId]);

    return meta;
}

function statusBadgeClass(message: string): string {
    if (message === "Error") return "bg-red-500/20 text-red-400";
    if (message === "In queue") return "bg-neutral-700 text-neutral-400";
    return "bg-[#ee1086]/15 text-[#ee1086]";
}

function DownloadMediaItem({ item }: { item: DownloadInfo }) {
    const meta = useMediaMeta(item.publicId);

    return (
        <div className="flex items-center gap-3 px-3 py-2">
            {/* Cover */}
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                {meta ? (
                    <Image
                        src={meta.imageUrl}
                        alt={meta.name}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="skeleton h-full w-full rounded" />
                )}
            </div>

            {/* Info + progress */}
            <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                    {meta ? (
                        <p className="truncate text-sm font-medium text-white">
                            {meta.name}
                        </p>
                    ) : (
                        <div className="skeleton h-3.5 w-2/3 rounded" />
                    )}
                    <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(item.message)}`}
                    >
                        {item.message === "Error"
                            ? "Error"
                            : item.completed === 100
                              ? "Done"
                              : item.message === "In queue"
                                ? "Queued"
                                : `${Math.round(item.completed)}%`}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                    <div
                        className="h-full rounded-full bg-linear-to-r from-[#ee1086] to-[#fb6467] transition-[width] duration-700"
                        style={{
                            width: `${item.message === "Error" ? 100 : item.completed}%`,
                            background:
                                item.message === "Error"
                                    ? "rgb(239 68 68)"
                                    : undefined,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Collapsible group ────────────────────────────────────────────────────────

type GroupStatus = "active" | "completed" | "failed";

interface Group {
    id: GroupStatus;
    label: string;
    items: DownloadInfo[];
    defaultOpen: boolean;
    accentClass: string;
    countClass: string;
}

function DownloadGroup({ group }: { group: Group }) {
    const [open, setOpen] = useState(group.defaultOpen);

    if (group.items.length === 0) return null;

    return (
        <div className="overflow-hidden rounded-lg bg-neutral-900">
            {/* Header */}
            <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-neutral-800/60"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <div className="flex items-center gap-2">
                    {open ? (
                        <ChevronDown className="h-4 w-4 text-neutral-400" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-neutral-400" />
                    )}
                    <span className="text-sm font-semibold text-white">
                        {group.label}
                    </span>
                    <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${group.countClass}`}
                    >
                        {group.items.length}
                    </span>
                </div>

                {/* Mini progress summary for active group */}
                {group.id === "active" && group.items.length > 0 && (
                    <span className="text-xs text-neutral-400 tabular-nums">
                        {Math.round(
                            group.items.reduce(
                                (sum, i) => sum + i.completed,
                                0
                            ) / group.items.length
                        )}
                        % avg
                    </span>
                )}
            </button>

            {/* Items */}
            {open && (
                <div className="divide-y divide-neutral-800/60 pb-1">
                    {group.items.map((item) => (
                        <DownloadMediaItem key={item.publicId} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({
    total,
    active,
    completed,
    failed,
}: {
    total: number;
    active: number;
    completed: number;
    failed: number;
}) {
    const stats = [
        { label: "Total", value: total, color: "text-white" },
        { label: "Active", value: active, color: "text-[#ee1086]" },
        { label: "Done", value: completed, color: "text-emerald-400" },
        { label: "Failed", value: failed, color: "text-red-400" },
    ];

    return (
        <div className="grid grid-cols-4 divide-x divide-neutral-800 rounded-lg bg-neutral-900 px-1">
            {stats.map((s) => (
                <div
                    key={s.label}
                    className="flex flex-col items-center py-3"
                >
                    <span className={`text-xl font-bold tabular-nums ${s.color}`}>
                        {s.value}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                        {s.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function DownloadLiveFeed() {
    const $downloads = useStore(rockIt.downloaderManager.downloadInfoAtom);

    const active = $downloads.filter(
        (d) => d.completed < 100 && d.message !== "Error"
    );
    const completed = $downloads.filter((d) => d.completed === 100);
    const failed = $downloads.filter((d) => d.message === "Error");

    const groups: Group[] = [
        {
            id: "active",
            label: "Active",
            items: active,
            defaultOpen: true,
            accentClass: "text-[#ee1086]",
            countClass: "bg-[#ee1086]/15 text-[#ee1086]",
        },
        {
            id: "completed",
            label: "Completed",
            items: completed,
            defaultOpen: false,
            accentClass: "text-emerald-400",
            countClass: "bg-emerald-400/15 text-emerald-400",
        },
        {
            id: "failed",
            label: "Failed",
            items: failed,
            defaultOpen: true,
            accentClass: "text-red-400",
            countClass: "bg-red-400/15 text-red-400",
        },
    ];

    return (
        <div className="flex flex-col gap-3">
            <StatsBar
                total={$downloads.length}
                active={active.length}
                completed={completed.length}
                failed={failed.length}
            />

            {$downloads.length === 0 ? (
                <p className="py-10 text-center text-sm font-semibold text-neutral-500">
                    No downloads yet
                </p>
            ) : (
                groups.map((g) => <DownloadGroup key={g.id} group={g} />)
            )}
        </div>
    );
}