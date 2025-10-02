"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import HeaderUser from "./HeaderUser";
import NotificationMenu from "./HeaderNotificationMenu";
import OnlineUserIndicator from "./HeaderOnlineUsers";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit";

export default function HeaderRight() {
    const [showMenu, setShowMenu] = useState(false);
    const bellRef = useRef<HTMLDivElement>(null);
    const $user = useStore(rockIt.userManager.userAtom);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                bellRef.current &&
                !bellRef.current.contains(event.target as Node)
            ) {
                setShowMenu(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative ml-auto flex items-center gap-5">
            <OnlineUserIndicator />

            <div ref={bellRef} className="relative">
                <button
                    onClick={() => setShowMenu((prev) => !prev)}
                    className="relative p-1"
                    aria-label="Toggle notifications"
                >
                    <Bell className="h-6 w-6 text-white" />

                    {/* Notification count */}
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                        3
                    </span>
                </button>

                {showMenu && <NotificationMenu />}
            </div>

            {$user ? (
                <HeaderUser />
            ) : (
                <a className="rounded bg-green-600 p-1 px-4" href="/login">
                    Login
                </a>
            )}
        </div>
    );
}
