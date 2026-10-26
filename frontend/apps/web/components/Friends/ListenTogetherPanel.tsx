"use client";

import { type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { Headphones, LogOut, Pause, Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import styles from "@/components/Friends/Friends.module.css";

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
            <section className={styles.session} aria-label={v.FRIENDS_PARTY}>
                <div className={styles.artwork}>
                    {active.currentMediaImageUrl ? (
                        <Image
                            src={active.currentMediaImageUrl}
                            alt={active.currentMediaName ?? ""}
                            width={400}
                            height={400}
                        />
                    ) : (
                        <Headphones size={72} strokeWidth={1.25} aria-hidden />
                    )}
                </div>
                <div className={styles.sessionCopy}>
                    <h2 className={styles.sessionTitle}>
                        {isHost ? active.guestUsername : active.hostUsername}
                    </h2>
                    <p className={styles.sessionStatus}>
                        {active.status === "invited"
                            ? v.FRIENDS_PENDING
                            : v.LISTENING_WITH}
                    </p>

                    {active.currentMediaName && (
                        <p className={styles.track}>
                            {active.currentMediaName}
                        </p>
                    )}
                    <div className={styles.controls}>
                        {active.status === "active" && (
                            <button
                                aria-label={playing ? v.PAUSE : v.PLAY}
                                disabled={!isHost && !active.isPlaying}
                                onClick={() => {
                                    rockIt.mediaPlayerManager.togglePlayPause();
                                }}
                                className={styles.play}
                            >
                                {playing ? (
                                    <Pause size={20} />
                                ) : (
                                    <Play size={20} />
                                )}
                            </button>
                        )}
                        <button
                            disabled={loading}
                            onClick={() => {
                                void rockIt.listenTogetherManager.leave(
                                    active.publicId
                                );
                            }}
                            className={styles.leave}
                        >
                            <LogOut size={14} />
                            {v.FRIENDS_LEAVE}
                        </button>
                    </div>
                </div>
            </section>
        );
    }
    return (
        <div className="flex flex-col gap-4">
            {sessions.map((session) => (
                <div key={session.publicId} className={styles.sessionInvite}>
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
                        className={styles.joinSession}
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
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}>
                        <Headphones size={30} strokeWidth={1.5} aria-hidden />
                    </div>
                    <h2>{v.FRIENDS_PARTY}</h2>
                    <p className={styles.subtitle}>{v.INVITE_FRIEND_LISTEN}</p>
                </div>
            )}
            {friends.length > 0 && (
                <>
                    <p className="text-sm text-neutral-400">
                        {v.FRIENDS_INVITE}
                    </p>
                    <div className={styles.people}>
                        {friends.map((friend) => (
                            <button
                                key={friend.publicId}
                                disabled={loading}
                                onClick={() => {
                                    void rockIt.listenTogetherManager.invite(
                                        friend.publicId
                                    );
                                }}
                                className={styles.person}
                            >
                                {friend.imageUrl ? (
                                    <Image
                                        src={friend.imageUrl}
                                        alt=""
                                        width={44}
                                        height={44}
                                        className={styles.avatar}
                                    />
                                ) : (
                                    <span className={styles.avatar} aria-hidden>
                                        {friend.username
                                            .slice(0, 1)
                                            .toUpperCase()}
                                    </span>
                                )}
                                <span>
                                    <span className={styles.personName}>
                                        {friend.username}
                                    </span>
                                    <span className={styles.personAction}>
                                        {v.FRIENDS_INVITE}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
