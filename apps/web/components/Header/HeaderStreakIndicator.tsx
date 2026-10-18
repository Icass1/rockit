"use client";

import { useEffect, useState, type JSX } from "react";
import { Flame } from "lucide-react";
import { Http } from "@/lib/http";

export default function StreakIndicator(): JSX.Element | null {
    const [streak, setStreak] = useState<number | null>(null);

    useEffect(() => {
        Http.getStreak().then((res) => {
            if (res.isOk()) {
                setStreak(res.result.currentStreak);
            }
        });
    }, []);

    if (!streak || streak <= 0) return null;

    return (
        <div
            className="flex items-center gap-1 text-orange-500"
            title={`${streak} day streak`}
        >
            <span className="text-sm font-semibold tabular-nums">
                {streak}d
            </span>
            <Flame className="h-7 w-7" />
        </div>
    );
}
