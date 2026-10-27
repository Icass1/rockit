"use client";

import { useId, useState, type JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStore } from "@nanostores/react";
import { Inbox, Play, Send, Trash2 } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import styles from "@/components/Friends/Friends.module.css";

export default function SharedMediaInbox(): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [view, setView] = useState<"inbox" | "sent">("inbox");
    const $inbox = useStore(rockIt.sharingManager.inboxAtom);
    const $sent = useStore(rockIt.sharingManager.sentAtom);
    const items = view === "inbox" ? $inbox : $sent;
    const [expanded, setExpanded] = useState(false);
    const listId = useId();
    const visibleItems = expanded ? items : items.slice(0, 3);

    const unreadCount = $inbox.filter((i) => !i.seen).length;

    return (
        <div className="flex flex-col gap-3">
            <div className={styles.inboxNavigation}>
                <button
                    aria-pressed={view === "inbox"}
                    onClick={() => {
                        setView("inbox");
                        setExpanded(false);
                    }}
                    className={
                        "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors " +
                        (view === "inbox"
                            ? "bg-[#ee1086] text-white"
                            : "bg-neutral-900 text-neutral-400 hover:text-white")
                    }
                >
                    <Inbox size={14} />
                    {v.FRIENDS_SHARE_RECEIVED}
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-white/20 px-1.5 text-xs">
                            {unreadCount}
                        </span>
                    )}
                </button>
                <button
                    aria-pressed={view === "sent"}
                    onClick={() => {
                        setView("sent");
                        setExpanded(false);
                    }}
                    className={
                        "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors " +
                        (view === "sent"
                            ? "bg-[#ee1086] text-white"
                            : "bg-neutral-900 text-neutral-400 hover:text-white")
                    }
                >
                    <Send size={14} />
                    {v.FRIENDS_SHARE_SENT}
                </button>
            </div>

            {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-neutral-500">
                    <Inbox size={32} />
                    <p className="text-sm">{v.FRIENDS_NO_SHARED}</p>
                </div>
            ) : (
                <div id={listId} className={styles.sharedItems}>
                    {visibleItems.map((item) => (
                        <div
                            key={item.publicId}
                            className={styles.sharedRow}
                            data-unread={!item.seen && view === "inbox"}
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
                                {["album", "playlist", "artist"].includes(
                                    item.mediaType
                                ) ? (
                                    <Link
                                        href={`/${item.mediaType}/${item.mediaPublicId}`}
                                        onClick={() => {
                                            if (!item.seen && view === "inbox")
                                                void rockIt.sharingManager.markAsSeen(
                                                    item.publicId
                                                );
                                        }}
                                        className="text-sm text-[#ee1086]"
                                    >
                                        {
                                            rockIt.vocabularyManager.vocabulary
                                                .FRIENDS_OPEN
                                        }
                                    </Link>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (!item.seen && view === "inbox")
                                                void rockIt.sharingManager.markAsSeen(
                                                    item.publicId
                                                );
                                            void rockIt.sharingManager.playSharedMedia(
                                                item.mediaPublicId
                                            );
                                        }}
                                        className="text-sm text-[#ee1086]"
                                    >
                                        {
                                            rockIt.vocabularyManager.vocabulary
                                                .PLAY
                                        }
                                    </button>
                                )}
                                <p className="truncate text-sm font-medium text-white">
                                    {item.mediaName}
                                </p>
                                <p className="truncate text-xs text-neutral-500">
                                    {view === "inbox"
                                        ? v.FRIENDS_SHARED_FROM.replace(
                                              "{name}",
                                              item.senderUsername
                                          )
                                        : v.FRIENDS_SHARED_TO.replace(
                                              "{name}",
                                              item.recipientUsername
                                          )}
                                </p>
                                {item.message && (
                                    <p className="mt-0.5 truncate text-xs text-neutral-600 italic">
                                        &ldquo;{item.message}&rdquo;
                                    </p>
                                )}
                            </div>
                            <button
                                aria-label={v.DELETE}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    void rockIt.sharingManager.deleteShare(
                                        item.publicId
                                    );
                                }}
                                className="p-2 text-neutral-500 hover:text-red-400"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {items.length > 3 && (
                <button
                    type="button"
                    className={styles.directoryExpand}
                    aria-expanded={expanded}
                    aria-controls={listId}
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded
                        ? v.FRIENDS_SHOW_LESS
                        : v.FRIENDS_SHOW_ALL_SHARES.replace(
                              "{count}",
                              String(items.length)
                          )}
                </button>
            )}
        </div>
    );
}
