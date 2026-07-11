import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import type { CoverflowCard } from "@/components/Home/HomeHeroCoverflow";

interface HomeSubtitleContext {
    cards: CoverflowCard[];
    centerIndex: number;
    streak?: number;
    minutesThisWeek?: number;
}

export function useHomeSubtitle({
    cards,
    centerIndex,
    streak,
    minutesThisWeek,
}: HomeSubtitleContext): string {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    return useMemo(() => {
        const currentCard = cards[centerIndex];
        if (currentCard?.song) {
            return `${$vocabulary.HOME_LISTEN_TO} ${currentCard.song.name}`;
        }

        if (typeof streak === "number" && streak > 0) {
            return `${streak} ${$vocabulary.HOME_STREAK_DAYS}`;
        }

        if (typeof minutesThisWeek === "number" && minutesThisWeek > 0) {
            return `${Math.round(minutesThisWeek)} ${$vocabulary.HOME_MINUTES_THIS_WEEK}`;
        }

        return $vocabulary.HOME_YOUR_MUSIC_AWAITS;
    }, [cards, centerIndex, streak, minutesThisWeek, $vocabulary]);
}
