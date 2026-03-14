"use client";

import Image from "next/image";
import Link from "next/link";
import type { RankedItem } from "@/components/Stats/mockStatsData";

export default function AlbumGrid({ albums }: { albums: RankedItem[] }) {
    const maxVal = Math.max(...albums.map((a) => a.value), 1);

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {albums.map((album, i) => {
                const pct = Math.round((album.value / maxVal) * 100);
                return (
                    <Link
                        key={album.id}
                        href={album.href}
                        className="group relative overflow-hidden rounded-xl bg-neutral-900 transition-transform hover:scale-[1.02] hover:shadow-xl"
                    >
                        <div className="absolute top-2 left-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white backdrop-blur-sm">
                            {i + 1}
                        </div>

                        <div className="aspect-square w-full overflow-hidden">
                            <Image
                                src={album.imageUrl ?? "/song-placeholder.png"}
                                alt={album.name}
                                width={200}
                                height={200}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        </div>

                        <div className="p-2.5">
                            <p className="truncate text-sm leading-tight font-semibold text-white">
                                {album.name}
                            </p>
                            {album.subtitle && (
                                <p className="mt-0.5 truncate text-xs text-neutral-500">
                                    {album.subtitle}
                                </p>
                            )}

                            <div className="mt-2 flex items-center gap-1.5">
                                <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-neutral-800">
                                    <div
                                        className="absolute h-full rounded-full bg-linear-to-r from-[#ee1086] to-[#fb6467]"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="shrink-0 text-[10px] font-bold text-neutral-500 tabular-nums">
                                    {album.value}
                                </span>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
