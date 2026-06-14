"use client";

import { type JSX } from "react";
import { useStore } from "@nanostores/react";
import { Headphones, LogOut, Pause, Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function ListenTogetherPanel(): JSX.Element {
    const $sessions = useStore(rockIt.listenTogetherManager.sessionsAtom);
    const $activeSession = useStore(
        rockIt.listenTogetherManager.activeSessionAtom
    );
    const $friends = useStore(rockIt.friendManager.friendsAtom);

    if ($activeSession) {
        const session = $activeSession;
        const isHost = session.hostPublicId === "me";
        const partner = isHost ? session.guestUsername : session.hostUsername;

        return (
            <div className="flex flex-col items-center gap-4 rounded-xl bg-gradient-to-br from-[#ee1086]/10 to-transparent p-6">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ee1086]/20">
                        <Headphones className="h-8 w-8 text-[#ee1086]" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-white">
                            Listening with
                        </p>
                        <p className="text-[#ee1086]">{partner}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
                        {session.isPlaying ? (
                            <Pause size={18} />
                        ) : (
                            <Play size={18} />
                        )}
                    </button>
                </div>

                {session.currentMediaName && (
                    <p className="text-sm text-neutral-400">
                        ▶ {session.currentMediaName}
                    </p>
                )}

                <button
                    onClick={() =>
                        rockIt.listenTogetherManager.leave(session.publicId)
                    }
                    className="flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20"
                >
                    <LogOut size={14} />
                    Leave Session
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500">Active Sessions</p>

            {$sessions.length > 0 ? (
                <div className="flex flex-col gap-2">
                    {$sessions.map((s) => (
                        <div
                            key={s.publicId}
                            className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
                                <Headphones className="h-6 w-6 text-neutral-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-white">
                                    {s.hostUsername} & {s.guestUsername}
                                </p>
                                <p className="text-xs text-neutral-500">
                                    {s.status === "active" ? "Active" : "Ended"}
                                </p>
                            </div>
                            {s.status === "active" && (
                                <button
                                    onClick={() =>
                                        rockIt.listenTogetherManager.join(
                                            s.publicId
                                        )
                                    }
                                    className="rounded-full bg-[#ee1086] px-4 py-1.5 text-xs font-medium text-white"
                                >
                                    Join
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-neutral-500">
                    <Headphones className="h-10 w-10" />
                    <p className="text-sm">No active sessions</p>
                    <p className="text-center text-xs text-neutral-600">
                        Invite a friend to listen together in real time
                    </p>
                </div>
            )}

            {$friends.length > 0 && (
                <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                        Invite a friend
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {$friends.slice(0, 6).map((friend) => (
                            <button
                                key={friend.publicId}
                                onClick={() =>
                                    rockIt.listenTogetherManager.invite(
                                        friend.publicId
                                    )
                                }
                                className="flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-[#ee1086]/20 hover:text-white"
                            >
                                {friend.username}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
