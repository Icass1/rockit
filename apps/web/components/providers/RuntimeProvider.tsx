"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    type JSX,
    type ReactNode,
} from "react";
import type { SessionResponse } from "@/dto";
import type { RuntimeServices } from "@/models/interfaces/runtimeServices";
import { rockIt } from "@/lib/rockit/rockIt";
import { ConnectionLifecycle } from "@/lib/runtime/connectionLifecycle";
import { RecommendationArtworkProvider } from "@/components/providers/RecommendationArtworkProvider";

const RuntimeContext = createContext<RuntimeServices | undefined>(undefined);

export function RuntimeProvider({
    children,
    initialSession,
    services = rockIt,
}: {
    children: ReactNode;
    initialSession?: SessionResponse;
    services?: RuntimeServices;
}): JSX.Element {
    const lifecycle = useMemo(
        () => new ConnectionLifecycle(services),
        [services]
    );
    useEffect(() => {
        if (initialSession) services.userManager.seedSession(initialSession);
    }, [initialSession, services]);
    useEffect(() => {
        void lifecycle.start().catch((error: unknown) => {
            console.error("Cannot initialize application runtime", error);
        });
        return () => lifecycle.stop();
    }, [lifecycle]);
    return (
        <RuntimeContext value={services}>
            <RecommendationArtworkProvider>
                {children}
            </RecommendationArtworkProvider>
        </RuntimeContext>
    );
}

export function useRuntimeServices(): RuntimeServices {
    return useContext(RuntimeContext) ?? rockIt;
}
