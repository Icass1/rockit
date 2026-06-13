"use client";

import { useState, useEffect, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import Image from "next/image";
import { Play, Inbox, Send } from "lucide-react";

export default function SharedMediaInbox(): JSX.Element {
    const [view, setView] = useState<"inbox" | "sent">("inbox");
    const $inbox = useStore(rockIt.sharingManager.inboxAtom);
    const $sent = useStore(rockIt.sharingManager.sentAtom);
    const items = view === "inbox" ? $inbox : $sent;

    useEffect(() => {
        rockIt.sharingManager.fetchInbox();
        rockIt.sharingManager.fetchSent();
    }, []);

    const unreadCount = $inbox.filter((i) => !i.seen).length;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex gap-2">
                <button
                    onClick={() => setView("inbox")}
                    className={
                        "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors " +
                        (view === "inbox"
                            ? "bg-[#ee1086] text-white"
                            : "bg-neutral-900 text-neutral-400 hover:text-white")
                    }
                >
                    <Inbox size={14} />
                    Received
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-white/20 px-1.5 text-xs">
                            {unreadCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setView("sent")}
                    className={
                        "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors " +
                        (view === "sent"
                            ? "bg-[#ee1086] text-white"
                            : "bg-neutral-900 text-neutral-400 hover:text-white")
                    }
                >
                    <Send size={14} />
                    Sent
                </button>
            </div>

            {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-neutral-500">
                    <Inbox size={32} />
                    <p className="text-sm">
                        {view === "inbox"
                            ? "No shared media yet"
                            : "Nothing shared yet"}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {items.map((item) => (
                        <div
                            key={item.publicId}
                            className={
                                "flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-neutral-900/50 " +
                                (!item.seen && view === "inbox"
                                    ? "border-l-2 border-[#ee1086] bg-neutral-900/30"
                                    : "bg-neutral-900/10")
                            }
                            onClick={() => {
                                if (!item.seen && view === "inbox") {
                                    rockIt.sharingManager.markAsSeen(
                                        item.publicId
                                    );
                                }
                            }}
                        >
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                                {item.mediaImageUrl ? (
                                    <Image
                                        src={item.mediaImageUrl}
                                        alt={item.mediaName}
                                        width={48}
                                        height={48}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-neutral-600">
                                        <Play size={20} />
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-white">
                                    {item.mediaName}
                                </p>
                                <p className="truncate text-xs text-neutral-500">
                                    {view === "inbox"
                                        ? `from ${item.senderUsername}`
                                        : `to ${item.senderUsername}`}
                                </p>
                                {item.message && (
                                    <p className="mt-0.5 truncate text-xs italic text-neutral-600">
                                        &ldquo;{item.message}&rdquo;
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
