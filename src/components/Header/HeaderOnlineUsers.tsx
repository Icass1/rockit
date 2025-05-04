"use client";

import { users } from "@/stores/users";
import { useStore } from "@nanostores/react";
import { User } from "lucide-react";

export default function OnlineUserIndicator() {
    const $users = useStore(users);

    return (
        <>
            {$users > 0 && (
                <div className="flex items-center gap-1 text-green-500">
                    <span className="text-md font-semibold">{$users}</span>
                    <User className="h-6 w-6" />
                </div>
            )}
        </>
    );
}
