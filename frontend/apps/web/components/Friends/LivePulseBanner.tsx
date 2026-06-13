"use client";

import { type JSX } from "react";
import Image from "next/image";

interface Friend {
    publicId: string;
    username: string;
    imageUrl: string | null;
    isOnline: boolean;
    nowPlaying: string | null;
    level: number;
    levelTitle: string | null;
    status: string;
    dateAdded: string;
}

function Waveform(): JSX.Element {
    return (
        <>
            <style>{`
                @keyframes rk-wave {
                    0%, 100% { transform: scaleY(0.3); }
                    50%       { transform: scaleY(1);   }
                }
                .rk-bar {
                    display: block;
                    width: 2px;
                    height: 10px;
                    border-radius: 1px;
                    background: linear-gradient(to top, #ee1086, #fb6467);
                    transform-origin: bottom center;
                    animation: rk-wave 0.85s ease-in-out infinite;
                }
                .rk-bar:nth-child(2) { animation-delay: 0.18s; }
                .rk-bar:nth-child(3) { animation-delay: 0.36s; }
            `}</style>
            <div className="flex items-end gap-[2px]">
                <span className="rk-bar" />
                <span className="rk-bar" />
                <span className="rk-bar" />
            </div>
        </>
    );
}

export default function LivePulseBanner({
    friends,
}: {
    friends: Friend[];
}): JSX.Element {
    const live = friends.filter((f) => f.isOnline).slice(0, 10);

    if (live.length === 0) return <></>;

    return (
        <div className="flex items-center gap-4 overflow-x-auto rounded-2xl border border-[#ee1086]/10 bg-[#ee1086]/[0.04] px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ee1086]/15">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-[#ee1086]" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#ee1086]">
                    {live.length} live
                </span>
            </div>

            <div className="h-8 w-px shrink-0 bg-white/[0.06]" />

            {live.map((friend) => (
                <button
                    key={friend.publicId}
                    className="flex shrink-0 flex-col items-center gap-1.5 outline-none"
                    title={
                        friend.nowPlaying
                            ? `${friend.username} · ${friend.nowPlaying}`
                            : friend.username
                    }
                >
                    <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-[#ee1086]/40 ring-offset-2 ring-offset-black">
                        {friend.imageUrl ? (
                            <Image
                                src={friend.imageUrl}
                                alt={friend.username}
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-neutral-800 text-sm font-bold text-neutral-500">
                                {friend.username[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>

                    {friend.nowPlaying ? (
                        <Waveform />
                    ) : (
                        <div className="h-[10px]" />
                    )}

                    <span className="max-w-[56px] truncate text-[10px] text-neutral-500">
                        {friend.username}
                    </span>
                </button>
            ))}
        </div>
    );
}
