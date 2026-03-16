"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { BaseSongWithAlbumResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { DownloadInfo } from "@/types/rockIt";
import { rockIt } from "@/lib/rockit/rockIt";

// ─── Per-item metadata fetch ──────────────────────────────────────────────────

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
                        data.album?.imageUrl ??
                        rockIt.SONG_PLACEHOLDER_IMAGE_URL,
                });
            })
            .catch(() => {
                /* stays null → skeleton stays */
            });
        return () => {
            cancelled = true;
        };
    }, [publicId]);

    return meta;
}

// ─── Single item ──────────────────────────────────────────────────────────────

function statusColor(item: DownloadInfo): string {
    if (item.status === "error") return "from-red-500 to-red-600";
    if (item.completed === 100) return "from-emerald-500 to-emerald-600";
    return "from-[#ee1086] to-[#fb6467]";
}

function statusLabel(item: DownloadInfo): string {
    if (item.message === "Error") return "Error";
    if (item.completed === 100) return "Done";
    if (item.message === "In queue") return "Queued";
    return `${Math.round(item.completed)}%`;
}

function DownloadMediaItem({ item }: { item: DownloadInfo }) {
    const meta = useMediaMeta(item.publicId);

    return (
        <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md">
                {meta ? (
                    <Image
                        src={meta.imageUrl}
                        alt={meta.name}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="skeleton h-full w-full" />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                    {meta ? (
                        <p className="truncate text-sm font-medium leading-none text-white">
                            {meta.name}
                        </p>
                    ) : (
                        <div className="skeleton h-3 w-2/3 rounded" />
                    )}
                    <span className="shrink-0 text-xs font-bold tabular-nums text-neutral-400">
                        {statusLabel(item)}
                    </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-800">
                    <div
                        className={`bg-linear-to-r h-full rounded-full transition-[width] duration-700 ${statusColor(item)}`}
                        style={{
                            width: `${item.message === "Error" ? 100 : item.completed}%`,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Collapsible group ────────────────────────────────────────────────────────

interface Group {
    id: string;
    label: string;
    items: DownloadInfo[];
    defaultOpen: boolean;
    dot: string;
    badge: string;
}

function DownloadGroup({ group }: { group: Group }) {
    const [open, setOpen] = useState(group.defaultOpen);
    if (group.items.length === 0) return null;

    return (
        <div className="overflow-hidden rounded-xl border border-neutral-800/50 bg-neutral-900/70">
            <button
                type="button"
                className="hover:bg-white/3 flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                {open ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                )}
                <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${group.dot}`}
                />
                <span className="flex-1 text-sm font-semibold text-white">
                    {group.label}
                </span>
                <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${group.badge}`}
                >
                    {group.items.length}
                </span>
                {group.id === "active" && (
                    <span className="text-xs tabular-nums text-neutral-500">
                        {Math.round(
                            group.items.reduce((s, i) => s + i.completed, 0) /
                                group.items.length
                        )}
                        % avg
                    </span>
                )}
            </button>
            {open && (
                <div className="divide-y divide-neutral-800/40">
                    {group.items.map((item) => (
                        <DownloadMediaItem key={item.publicId} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function useDownloadGroups() {
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
            dot: "bg-[#ee1086]",
            badge: "bg-[#ee1086]/15 text-[#ee1086]",
        },
        {
            id: "completed",
            label: "Completed",
            items: completed,
            defaultOpen: false,
            dot: "bg-emerald-400",
            badge: "bg-emerald-400/15 text-emerald-400",
        },
        {
            id: "failed",
            label: "Failed",
            items: failed,
            defaultOpen: true,
            dot: "bg-red-400",
            badge: "bg-red-400/15 text-red-400",
        },
    ];

    return {
        groups,
        total: $downloads.length,
        active,
        completed,
        failed,
        $downloads,
    };
}

export default function DownloadLiveFeed() {
    const { groups, $downloads } = useDownloadGroups();

    if ($downloads.length === 0) {
        return (
            <p className="py-8 text-center text-sm font-medium text-neutral-600">
                No downloads yet
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {groups.map((g) => (
                <DownloadGroup key={g.id} group={g} />
            ))}
        </div>
    );
}
