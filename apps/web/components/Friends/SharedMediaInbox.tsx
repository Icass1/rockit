"use client";

import { useId, useState, type JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStore } from "@nanostores/react";
import { Inbox, Play, Send, Trash2 } from "lucide-react";
import styles from "@/components/Friends/Friends.module.css";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function SharedMediaInbox(): JSX.Element {
    const { sharingManager } = useRuntimeServices();
    const v = useVocabulary();
    const error = useStore(sharingManager.errorAtom);
    const loading = useStore(sharingManager.loadingAtom);
    const [view, setView] = useState<"inbox" | "sent">("inbox");
    const $inbox = useStore(sharingManager.inboxAtom);
    const $sent = useStore(sharingManager.sentAtom);
    const items = view === "inbox" ? $inbox : $sent;
    const [expanded, setExpanded] = useState(false);
    const listId = useId();
    const visibleItems = expanded ? items : items.slice(0, 3);

    const unreadCount = $inbox.filter((i) => !i.seen).length;

    return (
        <div className="flex flex-col gap-3" aria-busy={loading}>
            {error && <p role="alert">{error}</p>}
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
                            ? "bg-primary text-foreground-strong"
                            : "bg-secondary text-muted-foreground hover:text-foreground-strong")
                    }
                >
                    <Inbox size={14} />
                    {v.FRIENDS_SHARE_RECEIVED}
                    {unreadCount > 0 && (
                        <span className="bg-foreground-strong/20 rounded-full px-1.5 text-xs">
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
                            ? "bg-primary text-foreground-strong"
                            : "bg-secondary text-muted-foreground hover:text-foreground-strong")
                    }
                >
                    <Send size={14} />
                    {v.FRIENDS_SHARE_SENT}
                </button>
            </div>

            {items.length === 0 ? (
                <div className="text-subtle-foreground flex flex-col items-center gap-2 py-12">
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
                            <div className="bg-muted h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                                {item.mediaImageUrl ? (
                                    <Image
                                        src={item.mediaImageUrl}
                                        alt={item.mediaName}
                                        width={48}
                                        height={48}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="text-disabled-foreground flex h-full w-full items-center justify-center">
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
                                                void sharingManager.markAsSeen(
                                                    item.publicId
                                                );
                                        }}
                                        className="text-primary text-sm"
                                    >
                                        {v.FRIENDS_OPEN}
                                    </Link>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (!item.seen && view === "inbox")
                                                void sharingManager.markAsSeen(
                                                    item.publicId
                                                );
                                            void sharingManager.playSharedMedia(
                                                item.mediaPublicId
                                            );
                                        }}
                                        className="text-primary text-sm"
                                    >
                                        {v.PLAY}
                                    </button>
                                )}
                                <p className="text-foreground-strong truncate text-sm font-medium">
                                    {item.mediaName}
                                </p>
                                <p className="text-subtle-foreground truncate text-xs">
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
                                    <p className="text-disabled-foreground mt-0.5 truncate text-xs italic">
                                        &ldquo;{item.message}&rdquo;
                                    </p>
                                )}
                            </div>
                            <button
                                aria-label={v.DELETE}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    void sharingManager.deleteShare(
                                        item.publicId
                                    );
                                }}
                                className="text-subtle-foreground hover:text-destructive-soft p-2"
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
