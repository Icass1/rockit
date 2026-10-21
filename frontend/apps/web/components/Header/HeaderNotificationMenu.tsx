"use client";

import { useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import {
    Bell,
    Check,
    CheckCheck,
    CircleAlert,
    Download,
    Megaphone,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import { ENotificationType } from "@/models/enums/notificationType";
import { rockIt } from "@/lib/rockit/rockIt";
import HeaderPopover from "@/components/Header/HeaderPopover";

export default function NotificationMenu({
    onClose,
}: {
    onClose: () => void;
}): JSX.Element {
    const notifications = useStore(
        rockIt.notificationManager.notificationsAtom
    );
    const vocabulary = useStore(
        rockIt.vocabularyManager.vocabularyAtom
    ) as unknown as Record<string, string>;
    const lang = useStore(rockIt.vocabularyManager.langAtom);
    const [filter, setFilter] = useState("all");
    const unread = notifications.filter((n) => !n.read).length;
    const visible = notifications.filter((n) => filter !== "unread" || !n.read);
    return (
        <HeaderPopover
            id="notification-center"
            label={vocabulary.NOTIFICATIONS_TITLE}
            className="w-[min(25rem,calc(100vw-2rem))]"
        >
            <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                <h2 className="flex-1 text-base font-semibold">
                    {vocabulary.NOTIFICATIONS_TITLE}{" "}
                    {unread > 0 && (
                        <span className="ml-1 text-sm text-pink-400">
                            {unread}
                        </span>
                    )}
                </h2>
                <button
                    onClick={onClose}
                    aria-label={vocabulary.NOTIFICATIONS_CLOSE}
                    className="rounded-lg p-2 text-neutral-400 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-pink-400"
                >
                    <X size={18} />
                </button>
            </div>
            <div
                className="flex gap-1 border-b border-white/10 px-4 pb-3"
                role="group"
                aria-label={vocabulary.NOTIFICATIONS_TITLE}
            >
                {[
                    ["all", vocabulary.NOTIFICATIONS_ALL],
                    ["unread", vocabulary.NOTIFICATIONS_UNREAD],
                ].map(([value, label]) => (
                    <button
                        key={value}
                        aria-pressed={filter === value}
                        onClick={() => setFilter(value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-pink-400 ${filter === value ? "bg-pink-500/15 text-pink-300" : "text-neutral-400 hover:bg-white/5 hover:text-white"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <ul className="max-h-[min(60dvh,28rem)] overflow-y-auto overscroll-contain">
                {visible.length === 0 ? (
                    <li className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                        <Bell className="text-neutral-500" size={28} />
                        <p className="text-sm font-medium">
                            {filter === "unread"
                                ? vocabulary.NOTIFICATIONS_NO_UNREAD
                                : vocabulary.NOTIFICATIONS_EMPTY}
                        </p>
                        <p className="text-xs leading-relaxed text-neutral-400">
                            {vocabulary.NOTIFICATIONS_EMPTY_DETAIL}
                        </p>
                    </li>
                ) : (
                    visible.map((n) => {
                        const Icon =
                            n.type === ENotificationType.ERROR ||
                            n.type === ENotificationType.WARN
                                ? CircleAlert
                                : n.category === "release"
                                  ? Megaphone
                                  : n.category === "download"
                                    ? Download
                                    : n.category === "import"
                                      ? Upload
                                      : Bell;
                        return (
                            <li
                                key={n.id}
                                className={`flex gap-3 border-b border-white/5 px-4 py-4 ${!n.read ? "bg-white/[0.03]" : ""}`}
                            >
                                <div
                                    className={`mt-0.5 self-start rounded-xl p-2 ${n.type === ENotificationType.ERROR ? "bg-red-500/10 text-red-400" : n.type === ENotificationType.WARN ? "bg-amber-500/10 text-amber-400" : n.category === "release" ? "bg-pink-500/10 text-pink-400" : "bg-white/5 text-neutral-300"}`}
                                >
                                    <Icon size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm leading-snug break-words">
                                        {n.message}
                                    </p>
                                    {n.detail && (
                                        <p className="mt-1 text-xs leading-relaxed break-words text-neutral-400">
                                            {n.detail}
                                        </p>
                                    )}
                                    <time
                                        dateTime={new Date(
                                            n.createdAt
                                        ).toISOString()}
                                        className="mt-2 block text-[11px] text-neutral-500"
                                    >
                                        {new Date(n.createdAt).toLocaleString(
                                            lang || "en",
                                            {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            }
                                        )}
                                    </time>
                                </div>
                                <div className="flex shrink-0 flex-col items-center gap-1">
                                    {!n.read && (
                                        <>
                                            <span className="mb-1 h-1.5 w-1.5 rounded-full bg-pink-400" />
                                            <button
                                                onClick={() =>
                                                    rockIt.notificationManager.markRead(
                                                        n.id
                                                    )
                                                }
                                                aria-label={
                                                    vocabulary.NOTIFICATIONS_READ
                                                }
                                                className="rounded p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                            >
                                                <Check size={15} />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() =>
                                            rockIt.notificationManager.dismiss(
                                                n.id
                                            )
                                        }
                                        aria-label={
                                            vocabulary.NOTIFICATIONS_REMOVE
                                        }
                                        className="rounded p-1.5 text-neutral-500 hover:bg-white/10 hover:text-white"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            </li>
                        );
                    })
                )}
            </ul>
            {notifications.length > 0 && (
                <div className="flex flex-wrap justify-between gap-2 border-t border-white/10 p-3">
                    <button
                        disabled={!unread}
                        onClick={() => rockIt.notificationManager.markAllRead()}
                        className="flex items-center gap-1.5 rounded-lg p-1.5 text-xs text-neutral-300 hover:bg-white/5 disabled:opacity-30"
                    >
                        <CheckCheck size={14} />
                        {vocabulary.NOTIFICATIONS_MARK_ALL}
                    </button>
                    <button
                        disabled={!notifications.some((n) => n.read)}
                        onClick={() => rockIt.notificationManager.clearRead()}
                        className="flex items-center gap-1.5 rounded-lg p-1.5 text-xs text-neutral-400 hover:bg-white/5 disabled:opacity-30"
                    >
                        <Trash2 size={14} />
                        {vocabulary.NOTIFICATIONS_CLEAR}
                    </button>
                </div>
            )}
        </HeaderPopover>
    );
}
