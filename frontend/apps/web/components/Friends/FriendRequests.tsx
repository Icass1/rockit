"use client";

import { type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { Check, X } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function FriendRequests(): JSX.Element {
    const $incoming = useStore(rockIt.friendManager.incomingRequestsAtom);

    if ($incoming.length === 0) return <></>;

    return (
        <div className="rounded-2xl border border-[#ee1086]/15 bg-[#ee1086]/[0.04] p-4">
            <p className="mb-3 text-[11px] font-semibold tracking-widest text-[#ee1086] uppercase">
                {$incoming.length}{" "}
                {$incoming.length === 1 ? "Friend Request" : "Friend Requests"}
            </p>

            <div className="flex flex-col gap-3">
                {$incoming.map((req) => (
                    <div key={req.publicId} className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                            {req.fromUserImageUrl ? (
                                <Image
                                    src={req.fromUserImageUrl}
                                    alt={req.fromUsername}
                                    width={36}
                                    height={36}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-neutral-500">
                                    {req.fromUsername[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                                {req.fromUsername}
                            </p>
                            {req.message && (
                                <p className="truncate text-xs text-neutral-500">
                                    &ldquo;{req.message}&rdquo;
                                </p>
                            )}
                        </div>

                        <div className="flex gap-1.5">
                            <button
                                onClick={() =>
                                    rockIt.friendManager.acceptRequest(
                                        req.publicId
                                    )
                                }
                                aria-label="Accept"
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 text-green-400 transition-colors hover:bg-green-500/20"
                            >
                                <Check size={15} />
                            </button>
                            <button
                                onClick={() =>
                                    rockIt.friendManager.rejectRequest(
                                        req.publicId
                                    )
                                }
                                aria-label="Decline"
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
