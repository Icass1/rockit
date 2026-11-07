"use client";

import { useSyncExternalStore } from "react";
import { networkStatus } from "@/lib/stores/networkStatus";

const subscribe = (onChange: () => void): (() => void) =>
    networkStatus.listen(onChange);

/** Keep the server connection indicator through hydration, then follow the browser. */
export function useNetworkStatus(): "online" | "offline" {
    return useSyncExternalStore(
        subscribe,
        () => networkStatus.get(),
        () => "offline"
    );
}
