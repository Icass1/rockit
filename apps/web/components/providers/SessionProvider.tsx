"use client";

import {
    createContext,
    useContext,
    useEffect,
    type JSX,
    type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { SessionResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { usePlaybackServices } from "@/components/providers/PlaybackProvider";

const SessionContext = createContext<SessionResponse | undefined>(undefined);

export function SessionProvider({
    initial,
    children,
}: {
    initial?: SessionResponse;
    children: ReactNode;
}): JSX.Element {
    const router = useRouter();
    const { userManager } = usePlaybackServices();
    useEffect(
        () =>
            userManager.sessionAtom.listen((session) => {
                if (session === null) {
                    router.replace("/login");
                    router.refresh();
                }
            }),
        [router, userManager]
    );
    return <SessionContext value={initial}>{children}</SessionContext>;
}

export function useSession(): SessionResponse | null | undefined {
    const initial = useContext(SessionContext);
    const { userManager } = usePlaybackServices();
    const current = useStore(userManager.sessionAtom);
    return current === undefined ? initial : current;
}
