"use client";

import { User } from "lucide-react";

export default function OnlineUserIndicator() {
    const $users = 1653;

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
