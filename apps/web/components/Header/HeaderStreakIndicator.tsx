"use client";

import { useEffect, useState, type JSX } from "react";
import { Http } from "@/lib/http";
import StreakFlame from "@/components/Header/StreakFlame";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function StreakIndicator(): JSX.Element | null {
    const vocabulary = useVocabulary();
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
            className="flex items-center gap-1 text-orange-100"
            title={`${streak} ${vocabulary.HOME_STREAK_DAYS}`}
        >
            <span className="text-sm font-semibold tabular-nums">{streak}</span>
            <StreakFlame days={streak} />
        </div>
    );
}
