import { useSyncExternalStore } from "react";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

function subscribe(listener: () => void): () => void {
    const timer = setInterval(listener, 60000);
    return () => clearInterval(timer);
}

export function useGreeting(initialHour = 12): string {
    const vocabulary = useVocabulary();
    const hour = useSyncExternalStore(
        subscribe,
        () => new Date().getHours(),
        () => initialHour
    );
    if (hour >= 6 && hour < 12) return vocabulary.GOOD_MORNING;
    if (hour >= 12 && hour < 18) return vocabulary.GOOD_AFTERNOON;
    return vocabulary.GOOD_EVENING;
}
