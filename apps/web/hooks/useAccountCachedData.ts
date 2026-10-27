"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import type { HttpResult } from "@rockit/shared";
import type { IAccountCachedData } from "@/models/interfaces/accountCachedData";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

/** Display the account's snapshot immediately, then apply the live API response. */
export default function useAccountCachedData<T>(
    fetchData: () => Promise<HttpResult<T>>,
    loadCached: (username: string) => Promise<T | null>,
    saveCached: (username: string, data: T) => Promise<void>
): IAccountCachedData<T> {
    const username = useStore(rockIt.userManager.usernameAtom);
    const loggedIn = useStore(rockIt.userManager.loggedInAtom);
    const request = useMemo(
        () => ({ username, loggedIn }),
        [username, loggedIn]
    );
    const [snapshot, setSnapshot] = useState<{
        owner: typeof request;
        data: T;
    }>();
    const [completed, setCompleted] = useState<typeof request>();

    useEffect((): (() => void) | undefined => {
        const { username, loggedIn } = request;
        if (!loggedIn || !username) return;
        let cancelled = false;
        let receivedNetwork = false;
        void loadCached(username)
            .then((data): void => {
                if (!cancelled && !receivedNetwork && data !== null)
                    setSnapshot({ owner: request, data });
            })
            .catch(() => {});
        // These methods validate responses through the shared HTTP schemas.
        void fetchData
            .call(Http)
            .then((response): void => {
                if (cancelled || !response.isOk()) return;
                receivedNetwork = true;
                setSnapshot({ owner: request, data: response.result });
                void saveCached(username, response.result).catch(() => {});
            })
            .catch((error: unknown): void => {
                if (!cancelled)
                    console.error("Error refreshing cached screen", error);
            })
            .finally((): void => {
                if (!cancelled) setCompleted(request);
            });
        return (): void => {
            cancelled = true;
        };
    }, [request, fetchData, loadCached, saveCached]);

    return {
        data:
            loggedIn && snapshot?.owner === request ? snapshot.data : undefined,
        loading: loggedIn && completed !== request,
    };
}
