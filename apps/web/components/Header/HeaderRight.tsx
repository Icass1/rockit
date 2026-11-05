"use client";

import { useCallback, useRef, useState, type JSX } from "react";
import Link from "next/link";
import { useStore } from "@nanostores/react";
import { Bell } from "lucide-react";
import NotificationMenu from "@/components/Header/HeaderNotificationMenu";
import OnlineUserIndicator from "@/components/Header/HeaderOnlineUsers";
import HeaderRightSkeleton from "@/components/Header/HeaderRightSkeleton";
import StreakIndicator from "@/components/Header/HeaderStreakIndicator";
import HeaderUser from "@/components/Header/HeaderUser";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function HeaderRight(): JSX.Element {
    const [showNotifications, setShowNotifications] = useState(false);
    const bellRef = useRef<HTMLDivElement>(null);
    const session = useSession();

    const { notificationManager } = useRuntimeServices();
    const notificationCount = useStore(notificationManager.unreadCountAtom);
    const vocabulary = useVocabulary() as unknown as Record<string, string>;

    const closeNotifications = useCallback(
        (): void => setShowNotifications(false),
        []
    );

    if (session === undefined) return <HeaderRightSkeleton />;

    return (
        <div className="relative ml-auto flex items-center gap-3 xl:gap-5">
            <StreakIndicator />
            <OnlineUserIndicator />

            {/* Notifications */}
            <div ref={bellRef} className="relative">
                <button
                    onClick={(): void =>
                        setShowNotifications((prev): boolean => !prev)
                    }
                    className={`focus-visible:outline-primary relative grid h-11 w-11 place-items-center rounded-xl border transition focus-visible:outline-2 ${showNotifications ? "border-primary/30 bg-primary/15 text-primary-soft" : "text-foreground hover:bg-foreground-strong/10 hover:text-foreground-strong border-transparent"}`}
                    aria-label={`${vocabulary.NOTIFICATIONS_TITLE} (${notificationCount})`}
                    aria-controls={
                        showNotifications ? "notification-center" : undefined
                    }
                    aria-expanded={showNotifications}
                >
                    <Bell className="h-6 w-6" />
                    {notificationCount > 0 && (
                        <span
                            className="bg-destructive-hover text-foreground-strong absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold"
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
            {session ? (
                <HeaderUser />
            ) : (
                <Link
                    href="/login"
                    className="bg-success-subtle text-foreground-strong hover:bg-success-subtle focus-visible:outline-primary flex min-h-11 items-center rounded px-4 py-1 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    {vocabulary.LOG_IN}
                </Link>
            )}
        </div>
    );
}
