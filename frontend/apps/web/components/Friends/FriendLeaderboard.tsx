"use client";

import { useEffect, useState, type JSX } from "react";
import Image from "next/image";
import { Flame, Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/models/interfaces";
import { rockIt } from "@/lib/rockit/rockIt";

export default function FriendLeaderboard(): JSX.Element {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(
        null
    );
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await rockIt.friendManager.fetchLeaderboard();
                setEntries(data.entries);
                setCurrentUser(data.currentUser);
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton h-14 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    const allEntries = currentUser
        ? [
              ...entries.filter((e) => e.userId !== currentUser.userId),
              currentUser,
          ]
        : entries;

    return (
        <div className="flex flex-col gap-3">
            {currentUser && (
                <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-r from-[#ee1086]/20 to-transparent p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#ee1086] to-[#fb6467] text-lg font-bold text-white">
                            {currentUser.imageUrl ? (
                                <Image
                                    src={currentUser.imageUrl}
                                    alt={currentUser.username}
                                    width={48}
                                    height={48}
                                    className="h-full w-full rounded-full object-cover"
                                />
                            ) : (
                                currentUser.username[0]?.toUpperCase()
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-white">
                                {currentUser.username}
                            </p>
                            <p className="text-xs text-neutral-400">
                                {currentUser.title ||
                                    `Level ${currentUser.level}`}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold text-white">
                                Lv.{currentUser.level}
                            </p>
                            <p className="text-xs text-neutral-500">
                                {currentUser.xp} XP
                            </p>
                        </div>
                    </div>
                    {currentUser.xpToNext > 0 && (
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-800">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467] transition-all"
                                style={{
                                    width: `${Math.min(
                                        100,
                                        (currentUser.xp /
                                            (currentUser.xp +
                                                currentUser.xpToNext)) *
                                            100
                                    )}%`,
                                }}
                            />
                        </div>
                    )}
                </div>
            )}

            <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                Leaderboard
            </p>

            {allEntries
                .sort((a, b) => b.xp - a.xp)
                .map((entry, i) => (
                    <div
                        key={entry.userId}
                        className={
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-neutral-900/50 " +
                            (currentUser?.userId === entry.userId
                                ? "ring-1 ring-[#ee1086]/30"
                                : "")
                        }
                    >
                        <div className="flex w-6 items-center justify-center">
                            {i === 0 ? (
                                <Trophy className="h-4 w-4 text-yellow-500" />
                            ) : i === 1 ? (
                                <Trophy className="h-4 w-4 text-neutral-400" />
                            ) : i === 2 ? (
                                <Trophy className="h-4 w-4 text-amber-700" />
                            ) : (
                                <span className="text-xs text-neutral-600">
                                    #{i + 1}
                                </span>
                            )}
                        </div>

                        <div className="h-9 w-9 overflow-hidden rounded-full bg-neutral-800">
                            {entry.imageUrl ? (
                                <Image
                                    src={entry.imageUrl}
                                    alt={entry.username}
                                    width={36}
                                    height={36}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-neutral-500">
                                    {entry.username[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                                {entry.username}
                            </p>
                            {entry.title && (
                                <p className="truncate text-[10px] text-neutral-500">
                                    {entry.title}
                                </p>
                            )}
                        </div>

                        {entry.streak > 0 && (
                            <div className="flex items-center gap-1 text-xs text-orange-400">
                                <Flame size={12} />
                                {entry.streak}
                            </div>
                        )}

                        <div className="text-right">
                            <p className="text-sm font-semibold text-white">
                                Lv.{entry.level}
                            </p>
                            <p className="text-[10px] text-neutral-500">
                                {entry.xp} XP
                            </p>
                        </div>
                    </div>
                ))}
        </div>
    );
}
