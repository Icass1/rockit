"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { rockIt } from "@/lib/rockit/rockIt";
import { useClickOutside } from "@/components/Header/hooks/useClickOutside";
import { useStore } from "@nanostores/react";
import { Bell } from "lucide-react";
import NotificationMenu from "./HeaderNotificationMenu";
import OnlineUserIndicator from "./HeaderOnlineUsers";
import HeaderUser from "./HeaderUser";

export default function HeaderRight() {
    const [showNotifications, setShowNotifications] = useState(false);
    const [isUserLoaded, setIsUserLoaded] = useState(false);
    const bellRef = useRef<HTMLDivElement>(null);
    const $user = useStore(rockIt.userManager.userAtom);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsUserLoaded(true);
    }, []);

    const notificationCount =
        rockIt.notificationManager.notifycationsAtom.get().length;

    const closeNotifications = useCallback(
        () => setShowNotifications(false),
        []
    );
    useClickOutside(bellRef, closeNotifications);

    return (
        <div className="relative ml-auto flex items-center gap-5">
            <OnlineUserIndicator />

            {/* Notifications */}
            <div ref={bellRef} className="relative">
                <button
                    onClick={() => setShowNotifications((prev) => !prev)}
                    className="relative p-1 text-white transition md:hover:text-gray-300"
                    aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ""}`}
                    aria-expanded={showNotifications}
                >
                    <Bell className="h-6 w-6" />
                    {notificationCount > 0 && (
                        <span
                            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                            aria-hidden
                        >
                            {notificationCount > 9 ? "9+" : notificationCount}
                        </span>
                    )}
                </button>

                {showNotifications && <NotificationMenu />}
            </div>

            {/* User / Login */}
            {!isUserLoaded ? null : $user ? (
                <HeaderUser />
            ) : (
                <Link
                    href="/login"
                    className="rounded bg-green-600 px-4 py-1 text-sm font-medium text-white transition hover:bg-green-700"
                >
                    Login
                </Link>
            )}
        </div>
    );
}
