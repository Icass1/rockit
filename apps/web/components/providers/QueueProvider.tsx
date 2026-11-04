"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    type JSX,
    type ReactNode,
} from "react";
import type {
    InitialPlayback,
    QueueContextValue,
} from "@/models/interfaces/initialPlayback";
import type { QueueManager } from "@/lib/managers/queueManager";
import { rockIt } from "@/lib/rockit/rockIt";

const QueueContext = createContext<QueueContextValue | undefined>(undefined);
const EMPTY_INITIAL: InitialPlayback = {};

export function QueueProvider({
    initial,
    children,
    manager = rockIt.queueManager,
}: {
    initial: InitialPlayback;
    children: ReactNode;
    manager?: QueueManager;
}): JSX.Element {
    const value = useMemo(() => ({ initial, manager }), [initial, manager]);
    useEffect(() => {
        if (initial.queue) manager.seedQueue(initial.queue);
    }, [initial.queue, manager]);
    return <QueueContext value={value}>{children}</QueueContext>;
}

export function useInitialPlayback(): InitialPlayback {
    return useContext(QueueContext)?.initial ?? EMPTY_INITIAL;
}

export function useQueueManager(): QueueManager {
    return useContext(QueueContext)?.manager ?? rockIt.queueManager;
}
