"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import {
    Bell,
    Check,
    CheckCheck,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    Download,
    LoaderCircle,
    Music2,
    UserRound,
    X,
} from "lucide-react";
import {
    notificationVocabularyText,
    replaceNotificationGaps,
} from "@/lib/notifications";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import {
    useLanguage,
    useVocabulary,
} from "@/components/providers/VocabularyProvider";
import Popover from "@/components/ui/Popover";

function EventIcon({ event }: { event: string }): JSX.Element {
    const Icon = event.endsWith("FAILED")
        ? CircleAlert
        : event.startsWith("DOWNLOAD") || event === "ZIP_READY"
          ? Download
          : event === "FRIEND_REQUEST" || event === "MEDIA_SHARED"
            ? UserRound
            : event.startsWith("IMPORT")
              ? Music2
              : Bell;
    return <Icon size={18} aria-hidden="true" />;
}

export default function NotificationMenu({
    onClose,
}: {
    onClose: () => void;
}): JSX.Element {
    const { notificationManager: manager } = useRuntimeServices();
    const notifications = useStore(manager.notificationsAtom);
    const unread = useStore(manager.unreadCountAtom);
    const total = useStore(manager.totalCountAtom);
    const error = useStore(manager.errorAtom);
    const loading = useStore(manager.loadingAtom);
    const pending = useStore(manager.actionPendingAtom);
    const vocabulary = useVocabulary();
    const lang = useLanguage();
    const [unreadOnly, setUnreadOnly] = useState(true);
    const [openingId, setOpeningId] = useState<string | null>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const router = useRouter();
    useEffect(() => {
        manager.setPage(0, unreadOnly);
    }, [manager, unreadOnly]);
    const offset = manager.offset;
    useEffect(() => {
        listRef.current?.scrollTo(0, 0);
    }, [offset, unreadOnly]);

    return (
        <Popover
            id="notification-center"
            label={vocabulary.NOTIFICATIONS_TITLE}
            onClose={onClose}
            className="notification-panel flex max-h-[min(36rem,calc(100dvh-8rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden"
        >
            <div className="flex shrink-0 items-center gap-2 px-4 pt-3 pb-1">
                <h2 className="flex-1 text-base font-semibold">
                    {vocabulary.NOTIFICATIONS_TITLE}
                </h2>
                {unread > 0 && (
                    <span className="bg-primary/15 text-primary rounded-full px-2.5 py-1 text-xs font-semibold">
                        {unread}
                    </span>
                )}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={vocabulary.NOTIFICATIONS_CLOSE}
                    className="overlay-icon-button"
                >
                    <X size={18} />
                </button>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 border-b border-(--overlay-border) px-3 pb-2">
                <div
                    className="flex gap-1"
                    role="group"
                    aria-label={vocabulary.NOTIFICATIONS_TITLE}
                >
                    {[false, true].map((only) => (
                        <button
                            key={String(only)}
                            type="button"
                            aria-pressed={unreadOnly === only}
                            onClick={() => setUnreadOnly(only)}
                            className={`overlay-action ${unreadOnly === only ? "bg-accent" : "text-muted-foreground"}`}
                        >
                            {only
                                ? vocabulary.NOTIFICATIONS_UNREAD
                                : vocabulary.NOTIFICATIONS_ALL}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    disabled={!unread || pending || loading}
                    onClick={() => void manager.markAllReadAsync()}
                    className="overlay-action text-primary"
                    aria-busy={pending}
                >
                    {pending ? (
                        <LoaderCircle
                            size={16}
                            className="animate-spin motion-reduce:animate-none"
                        />
                    ) : (
                        <CheckCheck size={16} />
                    )}
                    {vocabulary.NOTIFICATIONS_MARK_ALL}
                </button>
            </div>
            {error && (
                <div
                    role="alert"
                    className="text-destructive-soft flex shrink-0 items-center gap-2 border-b border-(--overlay-border) px-4 py-2 text-sm"
                >
                    <CircleAlert size={16} className="shrink-0" />
                    <span className="flex-1">
                        {vocabulary.NOTIFICATIONS_LOAD_FAILED}
                    </span>
                    <button
                        type="button"
                        className="overlay-action"
                        onClick={() => void manager.refreshAsync()}
                    >
                        {vocabulary.RETRY}
                    </button>
                </div>
            )}
            <ul
                ref={listRef}
                aria-busy={loading}
                className="min-h-0 overflow-y-auto overscroll-contain p-2"
            >
                {loading && !notifications.length ? (
                    <li
                        className="space-y-3 p-3"
                        aria-label={vocabulary.SEARCH_LOADING}
                    >
                        {[0, 1, 2].map((key) => (
                            <div
                                key={key}
                                className="flex h-16 items-center gap-3"
                            >
                                <div className="skeleton h-9 w-9 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <div className="skeleton h-3 w-4/5 rounded" />
                                    <div className="skeleton h-3 w-1/3 rounded" />
                                </div>
                            </div>
                        ))}
                    </li>
                ) : !notifications.length && !error ? (
                    <li className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                        <Bell
                            size={28}
                            className="text-subtle-foreground mb-1"
                            aria-hidden="true"
                        />
                        <p className="text-sm font-medium">
                            {unreadOnly
                                ? vocabulary.NOTIFICATIONS_NO_UNREAD
                                : vocabulary.NOTIFICATIONS_EMPTY}
                        </p>
                        <p className="text-muted-foreground max-w-64 text-sm">
                            {vocabulary.NOTIFICATIONS_EMPTY_DETAIL}
                        </p>
                    </li>
                ) : (
                    notifications.map((item) => {
                        const message = replaceNotificationGaps(
                            notificationVocabularyText(
                                vocabulary,
                                item.vocabularyKey
                            ),
                            item.replacements
                        );
                        const unreadItem = !item.readAt;
                        return (
                            <li
                                key={item.publicId}
                                className={`group mb-1 flex items-start rounded-lg last:mb-0 ${unreadItem ? "bg-primary/5" : ""}`}
                            >
                                <button
                                    type="button"
                                    disabled={
                                        !item.destination ||
                                        !!openingId ||
                                        pending
                                    }
                                    aria-label={
                                        item.destination
                                            ? `${vocabulary.NOTIFICATIONS_OPEN}: ${message}`
                                            : message
                                    }
                                    className="notification-row enabled:hover:bg-accent/50 flex min-w-0 flex-1 items-start gap-3 rounded-lg p-3 text-left enabled:cursor-pointer"
                                    onClick={() => {
                                        setOpeningId(item.publicId);
                                        void manager
                                            .destinationAsync(item)
                                            .then((url) => {
                                                if (url) {
                                                    router.push(url);
                                                    onClose();
                                                }
                                            })
                                            .catch(() =>
                                                manager.notifyError(
                                                    vocabulary.NOTIFICATIONS_LOAD_FAILED
                                                )
                                            )
                                            .finally(() => setOpeningId(null));
                                    }}
                                >
                                    <span
                                        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${item.eventKey.endsWith("FAILED") ? "bg-destructive/10 text-destructive-soft" : "bg-accent/50 text-foreground"}`}
                                    >
                                        {openingId === item.publicId ? (
                                            <LoaderCircle
                                                size={18}
                                                className="animate-spin motion-reduce:animate-none"
                                            />
                                        ) : (
                                            <EventIcon event={item.eventKey} />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span
                                            title={message}
                                            className={`line-clamp-3 text-sm leading-5 [overflow-wrap:anywhere] break-words ${unreadItem ? "text-foreground-strong font-medium" : "text-foreground"}`}
                                        >
                                            {message}
                                        </span>
                                        <time
                                            className="text-muted-foreground mt-1 block text-xs"
                                            dateTime={item.dateAdded}
                                            title={new Date(
                                                item.dateAdded
                                            ).toLocaleString(lang)}
                                        >
                                            {new Date(
                                                item.dateAdded
                                            ).toLocaleString(lang, {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </time>
                                        {unreadItem && (
                                            <span className="sr-only">
                                                {
                                                    vocabulary.NOTIFICATIONS_UNREAD
                                                }
                                            </span>
                                        )}
                                    </span>
                                    {item.destination && (
                                        <ChevronRight
                                            size={16}
                                            className="text-subtle-foreground mt-2 shrink-0"
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                                {unreadItem && (
                                    <button
                                        type="button"
                                        disabled={pending || !!openingId}
                                        className="overlay-icon-button text-foreground relative mt-2 mr-1"
                                        aria-label={`${vocabulary.NOTIFICATIONS_MARK_READ}: ${message}`}
                                        title={
                                            vocabulary.NOTIFICATIONS_MARK_READ
                                        }
                                        onClick={() =>
                                            void manager.markRead(item.publicId)
                                        }
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="bg-primary absolute top-1 right-1 h-1.5 w-1.5 rounded-full"
                                        />
                                        <Check size={16} />
                                    </button>
                                )}
                            </li>
                        );
                    })
                )}
            </ul>
            {total > 20 && (
                <div className="flex shrink-0 items-center justify-between border-t border-(--overlay-border) px-3 py-1.5 text-sm">
                    <button
                        type="button"
                        className="overlay-action"
                        disabled={!offset || loading || pending}
                        onClick={() => manager.setPage(offset - 20, unreadOnly)}
                    >
                        <ChevronLeft size={16} />
                        {vocabulary.NOTIFICATIONS_PREVIOUS}
                    </button>
                    <span
                        className="text-muted-foreground text-xs"
                        aria-live="polite"
                    >
                        {offset + 1}–{Math.min(offset + 20, total)} / {total}
                    </span>
                    <button
                        type="button"
                        className="overlay-action"
                        disabled={offset + 20 >= total || loading || pending}
                        onClick={() => manager.setPage(offset + 20, unreadOnly)}
                    >
                        {vocabulary.NOTIFICATIONS_NEXT}
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </Popover>
    );
}
