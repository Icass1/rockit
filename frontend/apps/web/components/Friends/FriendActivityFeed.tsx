"use client";

import { type JSX } from "react";
import { useStore } from "@nanostores/react";
import Image from "next/image";
import { Heart, ListPlus, Share2, Music2 } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import type { FriendActivity } from "@/models/interfaces";

type Activity = FriendActivity & {
    mediaArtist?: string;
    currentProgressMs?: number;
    durationMs?: number;
    isLiveNow?: boolean;
};

function timeAgo(dateStr: string, justNowText: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return justNowText;
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

function formatMs(ms: number): string {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function ActivityCard({ item, justNowText }: { item: Activity; justNowText: string }): JSX.Element {
    const progress =
        item.currentProgressMs && item.durationMs
            ? Math.min(100, (item.currentProgressMs / item.durationMs) * 100)
            : null;

    return (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">

            <div className="mb-3 flex items-center gap-2">
                <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                    {item.userImageUrl ? (
                        <Image
                            src={item.userImageUrl}
                            alt={item.username}
                            width={24}
                            height={24}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-neutral-500">
                            {item.username[0]?.toUpperCase()}
                        </div>
                    )}
                </div>
                <span className="text-xs font-medium text-neutral-400">
                    {item.username}
                </span>
                {item.isLiveNow && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-green-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                        live
                    </span>
                )}
                <span className="ml-auto text-[10px] text-neutral-700">
                    {timeAgo(item.listenedAt, justNowText)}
                </span>
            </div>

            <div className="flex items-center gap-3">
                <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-xl bg-neutral-800">
                    {item.mediaImageUrl ? (
                        <Image
                            src={item.mediaImageUrl}
                            alt={item.mediaName}
                            width={60}
                            height={60}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-700">
                            <Music2 size={22} />
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-snug text-white">
                        {item.mediaName}
                    </p>
                    {item.mediaArtist && (
                        <p className="mt-0.5 truncate text-sm text-neutral-500">
                            {item.mediaArtist}
                        </p>
                    )}

                    <div className="mt-2.5 flex items-center gap-2">
                        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                            {progress !== null && (
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467]"
                                    style={{ width: `${progress}%` }}
                                />
                            )}
                        </div>
                        {item.currentProgressMs != null && (
                            <span className="shrink-0 text-[10px] tabular-nums text-neutral-700">
                                {formatMs(item.currentProgressMs)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-0.5">
                {(
                    [
                        { icon: Heart, label: "Like" },
                        { icon: ListPlus, label: "Queue" },
                        { icon: Share2, label: "Share" },
                    ] as const
                ).map(({ icon: Icon, label }) => (
                    <button
                        key={label}
                        className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-neutral-600 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                        <Icon size={13} />
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function FriendActivityFeed({
    activities,
}: {
    activities: Activity[];
}): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const v = $vocabulary as unknown as Record<string, string>;
    const justNowText = v.JUST_NOW;

    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
                    <Music2 className="h-5 w-5 text-neutral-600" />
                </div>
                <div>
                    <p className="text-sm font-medium text-neutral-400">
                        {v.NOTHING_PLAYING_YET}
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">
                        {v.FRIENDS_ACTIVITY_WILL_APPEAR}
                    </p>
                </div>
            </div>
        );
    }

    const liveNow = activities.filter((a) => a.isLiveNow);
    const recent = activities.filter((a) => !a.isLiveNow);

    return (
        <div className="flex flex-col gap-6">
            {liveNow.length > 0 && (
                <section>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-600">
                        {v.NOW_PLAYING}
                    </p>
                    <div className="flex flex-col gap-2">
                        {liveNow.map((item, i) => (
                            <ActivityCard
                                key={`live-${item.userPublicId}-${item.mediaPublicId}-${i}`}
                                item={item}
                                justNowText={justNowText}
                            />
                        ))}
                    </div>
                </section>
            )}

            {recent.length > 0 && (
                <section>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-600">
                        {v.RECENT}
                    </p>
                    <div className="flex flex-col gap-2">
                        {recent.map((item, i) => (
                            <ActivityCard
                                key={`recent-${item.userPublicId}-${item.mediaPublicId}-${i}`}
                                item={item}
                                justNowText={justNowText}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
