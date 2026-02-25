"use client";

import { User } from "lucide-react";

//import { useStore } from "@nanostores/react";
//import { rockIt } from "@/lib/rockit/rockIt";

export default function OnlineUserIndicator() {
    const $onlineUsers = 1263; // useStore(rockIt.userManager.onlineUsersAtom);

    if (!$onlineUsers || $onlineUsers <= 0) return null;

    return (
        <div
            className="flex items-center gap-1 text-green-500"
            title={`${$onlineUsers} users online`}
        >
            <span className="text-sm font-semibold tabular-nums">
                {$onlineUsers}
            </span>
            <User className="h-5 w-5" />
        </div>
    );
}
