"use client";

import { type JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { Check, X } from "lucide-react";
import styles from "@/components/Friends/Friends.module.css";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function FriendRequests(): JSX.Element {
    const { friendManager } = useRuntimeServices();
    const v = useVocabulary();
    const $incoming = useStore(friendManager.incomingRequestsAtom);

    if ($incoming.length === 0) return <></>;

    return (
        <div className={styles.requests}>
            <p className={styles.sectionTitle}>
                {$incoming.length}{" "}
                {$incoming.length === 1 ? v.FRIEND_REQUEST : v.FRIEND_REQUESTS}
            </p>

            <div className="flex flex-col gap-3">
                {$incoming.map((req) => (
                    <div key={req.publicId} className="flex items-center gap-3">
                        <div className="bg-muted h-9 w-9 shrink-0 overflow-hidden rounded-full">
                            {req.fromUserImageUrl ? (
                                <Image
                                    src={req.fromUserImageUrl}
                                    alt={req.fromUsername}
                                    width={36}
                                    height={36}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="text-subtle-foreground flex h-full w-full items-center justify-center text-sm font-bold">
                                    {req.fromUsername[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-foreground-strong truncate text-sm font-medium">
                                {req.fromUsername}
                            </p>
                            {req.message && (
                                <p className="text-subtle-foreground truncate text-xs">
                                    &ldquo;{req.message}&rdquo;
                                </p>
                            )}
                        </div>

                        <div className="flex gap-1.5">
                            <button
                                onClick={() =>
                                    friendManager.acceptRequest(req.publicId)
                                }
                                aria-label={v.FRIENDS_ACCEPT}
                                className="bg-success/10 text-success-foreground hover:bg-success/20 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                            >
                                <Check size={15} />
                            </button>
                            <button
                                onClick={() =>
                                    friendManager.rejectRequest(req.publicId)
                                }
                                aria-label={v.FRIENDS_DECLINE}
                                className="bg-foreground-strong/[0.06] text-subtle-foreground hover:bg-foreground-strong/10 hover:text-foreground-strong flex h-8 w-8 items-center justify-center rounded-full transition-colors"
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
