"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import Link from "next/link";
import { useStore } from "@nanostores/react";
import { Bell } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import NotificationMenu from "@/components/Header/HeaderNotificationMenu";
import OnlineUserIndicator from "@/components/Header/HeaderOnlineUsers";
import StreakIndicator from "@/components/Header/HeaderStreakIndicator";
import HeaderUser from "@/components/Header/HeaderUser";
import { useClickOutside } from "@/components/Header/hooks/useClickOutside";

export default function HeaderRight(): JSX.Element {
    const [showNotifications, setShowNotifications] = useState(false);
    const [isUserLoaded, setIsUserLoaded] = useState(false);
    const bellRef = useRef<HTMLDivElement>(null);
    const $loggedIn = useStore(rockIt.userManager.loggedInAtom);

    useEffect((): void => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsUserLoaded(true);
    }, []);

    const notifications = useStore(
        rockIt.notificationManager.notificationsAtom
    );
    const vocabulary = useStore(
        rockIt.vocabularyManager.vocabularyAtom
    ) as unknown as Record<string, string>;
    const notificationCount = notifications.filter((n) => !n.read).length;

    useEffect(() => {
        if (!showNotifications) return;
        bellRef.current
            ?.querySelector<HTMLElement>("#notification-center button")
            ?.focus();
        const onKey = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                setShowNotifications(false);
                bellRef.current?.querySelector("button")?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [showNotifications]);

    const closeNotifications = useCallback(
        (): void => setShowNotifications(false),
        []
    );
    useClickOutside(bellRef, closeNotifications);

    return (
        <div className="relative ml-auto flex items-center gap-5">
            <StreakIndicator />
            <OnlineUserIndicator />

            {/* Notifications */}
            <div ref={bellRef} className="relative">
                <button
                    onClick={(): void =>
                        setShowNotifications((prev): boolean => !prev)
                    }
                    className={`relative grid h-10 w-10 place-items-center rounded-xl border transition focus-visible:outline-2 focus-visible:outline-(--rockit-pink) ${showNotifications ? "border-(--rockit-pink)/30 bg-(--rockit-pink)/15 text-(--rockit-pink)" : "border-transparent text-neutral-300 hover:bg-white/10 hover:text-white"}`}
                    aria-label={`${vocabulary.NOTIFICATIONS_TITLE} (${notificationCount})`}
                    aria-controls={
                        showNotifications ? "notification-center" : undefined
                    }
                    aria-expanded={showNotifications}
                >
                    <Bell className="h-6 w-6" />
                    {notificationCount > 0 && (
                        <span
                            className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                            aria-hidden
                        >
                            {notificationCount > 9 ? "9+" : notificationCount}
                        </span>
                    )}
                </button>

                {showNotifications && (
                    <NotificationMenu onClose={closeNotifications} />
                )}
            </div>

            {/* User / Login */}
            {!isUserLoaded ? null : $loggedIn ? (
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
