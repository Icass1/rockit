import { useEffect, useMemo } from "react";
import {
    createAtom,
    type BaseMediaPlayerManager,
    type ReadonlyAtom,
} from "@rockit/shared";

type PlaybackSource = Pick<
    BaseMediaPlayerManager,
    "currentTimeAtom" | "playingAtom" | "readPlaybackTimeForDisplay"
>;

interface FrameScheduler {
    requestAnimationFrame(callback: (timestamp: number) => void): number;
    cancelAnimationFrame(frame: number): void;
}

/** Sample the real playhead between media events only while displaying synced words. */
export function useLyricPlaybackClock(
    player: PlaybackSource,
    wordSync: boolean,
    getScheduler?: () => FrameScheduler | null | undefined
): ReadonlyAtom<number> {
    const clock = useMemo(
        () => createAtom(player.currentTimeAtom.get()),
        [player]
    );

    useEffect(() => {
        const scheduler = getScheduler?.() ?? globalThis;
        let frame: number | undefined;
        const publish = () =>
            clock.set(
                wordSync
                    ? player.readPlaybackTimeForDisplay()
                    : player.currentTimeAtom.get()
            );
        const stop = () => {
            if (frame !== undefined) scheduler.cancelAnimationFrame(frame);
            frame = undefined;
        };
        const tick = () => {
            frame = scheduler.requestAnimationFrame(tick);
            publish();
        };
        const updatePlaying = () => {
            stop();
            publish();
            if (wordSync && player.playingAtom.get())
                frame = scheduler.requestAnimationFrame(tick);
        };
        const unlistenTime = player.currentTimeAtom.listen(publish);
        const unlistenPlaying = player.playingAtom.listen(updatePlaying);
        updatePlaying();
        return () => {
            stop();
            unlistenTime();
            unlistenPlaying();
        };
    }, [clock, getScheduler, player, wordSync]);

    return clock;
}
