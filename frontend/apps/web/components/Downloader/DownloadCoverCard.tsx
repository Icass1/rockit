"use client";

import { type JSX } from "react";
import Image from "next/image";
import { DownloadItemResponse } from "@/dto";
import { Check, Music, RotateCw } from "lucide-react";

export default function DownloadCoverCard({
    item,
}: {
    item: DownloadItemResponse;
}): JSX.Element {
    const isCompleted = item.status === "COMPLETED";
    const isFailed = item.status === "FAILED";
    const progress = Math.max(0, Math.min(100, item.progress ?? 0));

    const ringColor = isFailed ? "#c72e2e" : "#ee1086";
    const circumference = 2 * Math.PI * 18;
    const dashOffset = circumference - (progress / 100) * circumference;

    return (
        <div className="group flex flex-col gap-2">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-800">
                {item.imageUrl ? (
                    <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="200px"
                        className="object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-600">
                        <Music size={28} />
                    </div>
                )}

                {!isCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
                            <circle
                                cx="22"
                                cy="22"
                                r="18"
                                fill="none"
                                stroke="#525252"
                                strokeWidth="4"
                            />
                            <circle
                                cx="22"
                                cy="22"
                                r="18"
                                fill="none"
                                stroke={ringColor}
                                strokeWidth="4"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                            />
                        </svg>
                        {isFailed && (
                            <button className="absolute text-white hover:text-[#ee1086]">
                                <RotateCw size={16} />
                            </button>
                        )}
                    </div>
                )}

                {isCompleted && (
                    <div className="absolute top-1.5 right-1.5 rounded-full bg-[#1cad60] p-1 text-white">
                        <Check size={12} />
                    </div>
                )}
            </div>

            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{item.name}</p>
                <p className="truncate text-xs text-neutral-400">{item.subtitle ?? "—"}</p>
            </div>
        </div>
    );
}
