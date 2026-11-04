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
import { rockIt } from "@/lib/rockit/rockIt";

const SessionContext = createContext<SessionResponse | undefined>(undefined);

export function SessionProvider({
    initial,
    children,
}: {
    initial?: SessionResponse;
    children: ReactNode;
}): JSX.Element {
    const router = useRouter();
    useEffect(
        () =>
            rockIt.userManager.sessionAtom.listen((session) => {
                if (session === null) {
                    router.replace("/login");
                    router.refresh();
                }
            }),
        [router]
    );
    return <SessionContext value={initial}>{children}</SessionContext>;
}

export function useSession(): SessionResponse | null | undefined {
    const initial = useContext(SessionContext);
    const current = useStore(rockIt.userManager.sessionAtom);
    return current === undefined ? initial : current;
}
