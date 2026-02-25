"use client";

import { useState } from "react";
import { BellOff, Trash2 } from "lucide-react";

interface Notification {
    id: number;
    message: string;
}

// Placeholder data — replace with real atom/fetch when backend is ready
const MOCK_NOTIFICATIONS: Notification[] = [
    { id: 1, message: "New song added to your playlist" },
    { id: 2, message: "You have a new friend request" },
    { id: 3, message: "System update completed" },
];

export default function NotificationMenu() {
    const [notifications, setNotifications] =
        useState<Notification[]>(MOCK_NOTIFICATIONS);

    const remove = (id: number) =>
        setNotifications((prev) => prev.filter((n) => n.id !== id));

    const clearAll = () => setNotifications([]);

    return (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-lg bg-neutral-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-700 px-4 py-3">
                <span className="font-bold text-white">Notifications</span>
                {notifications.length > 0 && (
                    <button
                        onClick={clearAll}
                        className="text-xs text-gray-400 transition hover:text-white"
                    >
                        Clear all
                    </button>
                )}
            </div>

            <ul className="max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                    <li className="flex flex-col items-center gap-2 px-4 py-6 text-sm text-gray-400">
                        <BellOff className="h-6 w-6" />
                        <span>No notifications</span>
                    </li>
                ) : (
                    notifications.map((notif) => (
                        <li
                            key={notif.id}
                            className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-white transition hover:bg-neutral-700"
                        >
                            <span className="flex-1">{notif.message}</span>
                            <button
                                aria-label="Remove notification"
                                onClick={() => remove(notif.id)}
                                className="shrink-0 text-gray-400 transition hover:text-red-500"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}
