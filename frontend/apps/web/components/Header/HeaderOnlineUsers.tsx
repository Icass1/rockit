"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { User } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function OnlineUserIndicator(): JSX.Element {
    const onlineUsers = useStore(rockIt.webSocketManager.onlineUsersAtom);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const available = onlineUsers !== undefined;
    return (
        <div
            className={`flex items-center gap-1 ${available ? "text-green-400" : "text-neutral-300"}`}
            title={vocabulary.ONLINE_LABEL}
            aria-label={
                available
                    ? `${onlineUsers} · ${vocabulary.ONLINE_LABEL}`
                    : vocabulary.ONLINE_LABEL
            }
        >
            <span className="text-sm font-semibold tabular-nums" role="status">
                {onlineUsers ?? "—"}
            </span>
            <User className="h-7 w-7" aria-hidden="true" />
        </div>
    );
}
