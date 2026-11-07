"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    type JSX,
    type ReactNode,
} from "react";
import type { PlaybackServices } from "@/models/interfaces/playbackServices";
import { rockIt } from "@/lib/rockit/rockIt";
import { PlaybackLifecycle } from "@/lib/runtime/playbackLifecycle";

const PlaybackContext = createContext<PlaybackServices | undefined>(undefined);

export function PlaybackProvider({
    children,
    services = rockIt,
}: {
    children: ReactNode;
    services?: PlaybackServices;
}): JSX.Element {
    const lifecycle = useMemo(
        () => new PlaybackLifecycle(services),
        [services]
    );
    useEffect(() => {
        lifecycle.start();
        return () => lifecycle.stop();
    }, [lifecycle]);
    return <PlaybackContext value={services}>{children}</PlaybackContext>;
}

export function usePlaybackServices(): PlaybackServices {
    // Compatibility for consumers still mounted outside the authenticated shell.
    return useContext(PlaybackContext) ?? rockIt;
}
