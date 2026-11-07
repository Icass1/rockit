"use client";

import { type JSX } from "react";
import Image from "next/image";
import type { Friend } from "@/models/interfaces";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

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
                    background: linear-gradient(to top, var(--theme-primary), var(--theme-brand-light));
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
    const { listenTogetherManager } = useRuntimeServices();
    const v = useVocabulary();
    const online = friends.filter((f) => f.isOnline);
    const live = online.slice(0, 10);

    if (live.length === 0) return <></>;

    return (
        <div className="border-primary/10 bg-primary/[0.04] flex items-center gap-4 overflow-x-auto rounded-2xl border px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div className="bg-primary/15 flex h-8 w-8 items-center justify-center rounded-full">
                    <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
                </div>
                <span className="text-primary text-[10px] font-semibold tracking-wider uppercase">
                    {online.length} {v.FRIENDS_ONLINE}
                </span>
            </div>

            <div className="bg-foreground-strong/[0.06] h-8 w-px shrink-0" />

            {live.map((friend) => (
                <button
                    key={friend.publicId}
                    onClick={() => {
                        void listenTogetherManager.invite(friend.publicId);
                    }}
                    className="flex shrink-0 flex-col items-center gap-1.5 outline-none"
                    title={
                        friend.nowPlaying
                            ? `${friend.username} · ${friend.nowPlaying}`
                            : friend.username
                    }
                >
                    <div className="ring-primary/40 ring-offset-backdrop h-10 w-10 overflow-hidden rounded-full ring-2 ring-offset-2">
                        {friend.imageUrl ? (
                            <Image
                                src={friend.imageUrl}
                                alt={friend.username}
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="bg-muted text-subtle-foreground flex h-full w-full items-center justify-center text-sm font-bold">
                                {friend.username[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>

                    {friend.nowPlaying ? (
                        <Waveform />
                    ) : (
                        <div className="h-[10px]" />
                    )}

                    <span className="text-subtle-foreground max-w-[56px] truncate text-[10px]">
                        {friend.username}
                    </span>
                </button>
            ))}
        </div>
    );
}
