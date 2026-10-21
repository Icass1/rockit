"use client";

import { type JSX } from "react";
import { useStore } from "@nanostores/react";
import { Headphones, LogOut, Pause, Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function ListenTogetherPanel(): JSX.Element {
    const sessions = useStore(rockIt.listenTogetherManager.sessionsAtom);
    const active = useStore(rockIt.listenTogetherManager.activeSessionAtom);
    const loading = useStore(rockIt.listenTogetherManager.loadingAtom);
    const friends = useStore(rockIt.friendManager.friendsAtom);
    const username = useStore(rockIt.userManager.usernameAtom);
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    if (active) {
        const isHost = active.hostUsername === username;
        return (
            <div className="flex flex-col items-center gap-4 rounded-xl bg-gradient-to-br from-[#ee1086]/10 to-transparent p-6">
                <Headphones className="h-12 w-12 text-[#ee1086]" />
                <p className="text-lg font-bold text-white">
                    {active.status === "invited"
                        ? v.FRIENDS_PENDING
                        : v.LISTENING_WITH}
                </p>
                <p className="text-[#ee1086]">
                    {isHost ? active.guestUsername : active.hostUsername}
                </p>
                {active.status === "active" && (
                    <button
                        aria-label={playing ? v.PAUSE : v.PLAY}
                        disabled={!isHost && !active.isPlaying}
                        onClick={() => {
                            rockIt.mediaPlayerManager.togglePlayPause();
                        }}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
                    >
                        {playing ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                )}
                {active.currentMediaName && (
                    <p className="text-sm text-neutral-400">
                        {active.currentMediaName}
                    </p>
                )}
                <button
                    disabled={loading}
                    onClick={() => {
                        void rockIt.listenTogetherManager.leave(
                            active.publicId
                        );
                    }}
                    className="flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm text-red-400"
                >
                    <LogOut size={14} />
                    {v.FRIENDS_LEAVE}
                </button>
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-4">
            {sessions.map((session) => (
                <div
                    key={session.publicId}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 p-4"
                >
                    <Headphones className="text-[#ee1086]" />
                    <p className="flex-1 text-sm text-white">
                        {session.hostUsername}
                    </p>
                    <button
                        disabled={loading}
                        onClick={() => {
                            void rockIt.listenTogetherManager.join(
                                session.publicId
                            );
                        }}
                        className="rounded-full bg-[#ee1086] px-4 py-2 text-sm text-white"
                    >
                        {v.FRIENDS_JOIN}
                    </button>
                    <button
                        disabled={loading}
                        onClick={() => {
                            void rockIt.listenTogetherManager.leave(
                                session.publicId
                            );
                        }}
                        className="text-sm text-neutral-400"
                    >
                        {v.FRIENDS_LEAVE}
                    </button>
                </div>
            ))}
            {sessions.length === 0 && (
                <p className="py-8 text-center text-neutral-500">
                    {v.FRIENDS_NO_SESSIONS}
                </p>
            )}
            {friends.length > 0 && (
                <>
                    <p className="text-sm text-neutral-400">
                        {v.FRIENDS_INVITE}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {friends.map((friend) => (
                            <button
                                key={friend.publicId}
                                disabled={loading}
                                onClick={() => {
                                    void rockIt.listenTogetherManager.invite(
                                        friend.publicId
                                    );
                                }}
                                className="rounded-full bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
                            >
                                {friend.username}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
