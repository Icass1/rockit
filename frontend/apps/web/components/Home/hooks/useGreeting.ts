import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

function getPeriod(hour: number): string {
    if (hour >= 6 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    return "evening";
}

export function useGreeting(): string {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [period, setPeriod] = useState(() =>
        getPeriod(new Date().getHours())
    );

    useEffect(() => {
        const timer = setInterval(() => {
            setPeriod(getPeriod(new Date().getHours()));
        }, 3600000);

        return () => clearInterval(timer);
    }, []);

    if (period === "morning") return $vocabulary.GOOD_MORNING;
    if (period === "afternoon") return $vocabulary.GOOD_AFTERNOON;
    return $vocabulary.GOOD_EVENING;
}
