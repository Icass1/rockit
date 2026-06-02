"use client";

import { JSX, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { type StatsRankedItemResponse } from "@/dto";

export default function RecentMixPlaylistPage(): JSX.Element {
    const router = useRouter();
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [topSongs, setTopSongs] = useState<StatsRankedItemResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(
        () => Http.getUserStats({ range: "7d", start: null, end: null }),
        []
    );

    useEffect(() => {
        fetchStats().then((res) => {
            if (res.isOk()) setTopSongs(res.result.topSongs);
            setLoading(false);
        });
    }, [fetchStats]);

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="mb-6 text-3xl font-bold">{$vocabulary.RECENT_MIX}</h1>
            {topSongs.length === 0 ? (
                <p className="text-neutral-400">{$vocabulary.NO_DATA}</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {topSongs.map((item) => (
                        <div
                            key={item.publicId}
                            className="flex cursor-pointer items-center gap-4 rounded-md p-2 transition hover:bg-neutral-800"
                            onClick={() => router.push(item.href)}
                        >
                            <Image
                                src={item.imageUrl ?? "/song-placeholder.png"}
                                alt={item.name}
                                width={48}
                                height={48}
                                className="h-12 w-12 rounded object-cover"
                            />
                            <div className="flex-1 truncate">
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-neutral-400">
                                    {item.subtitle}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
