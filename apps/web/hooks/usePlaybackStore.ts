import { useCallback, useSyncExternalStore } from "react";
import type { TPlayableMedia } from "@/models/types/media";
import type { ReadonlyAtom } from "@/lib/store";
import {
    useInitialPlayback,
    useQueueManager,
} from "@/components/providers/QueueProvider";

/** Preserve the request snapshot until the browser runtime takes ownership. */
export function usePlaybackStore<T>(store: ReadonlyAtom<T>, initial: T): T {
    const { queue } = useInitialPlayback();
    const ready = useQueueManager().readyAtom;
    const subscribe = useCallback(
        (onChange: () => void): (() => void) => {
            const unsubscribeStore = store.listen(onChange);
            const unsubscribeReady = ready.listen(onChange);
            return () => {
                unsubscribeStore();
                unsubscribeReady();
            };
        },
        [store, ready]
    );
    return useSyncExternalStore(
        subscribe,
        () => (queue && !ready.get() ? initial : store.get()),
        () => initial
    );
}

export function useCurrentMedia(): TPlayableMedia | undefined {
    const { queue } = useInitialPlayback();
    const initial = queue?.queue.find(
        (item) => item.queueMediaId === queue.currentQueueMediaId
    )?.media;
    return usePlaybackStore(useQueueManager().currentMediaAtom, initial);
}
