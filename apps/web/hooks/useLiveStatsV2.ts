"use client";

import { useEffect, useState } from "react";
import type { UserStatsV2Response } from "@/dto";
import { EWebSocketMessage, type HttpResult } from "@rockit/shared";
import type { IUseFetch } from "@/models/interfaces/useFetch";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export function useLiveStatsV2(
    fetchStats: () => Promise<HttpResult<UserStatsV2Response>>
): Omit<IUseFetch<UserStatsV2Response>, "update"> {
    const [data, setData] = useState<UserStatsV2Response>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();
    const errorMessage = useVocabulary().MOBILE_STATS_ERROR;

    useEffect(() => {
        let active = true;
        let pending = false;
        let interval: ReturnType<typeof setInterval> | undefined;
        const refresh = async (): Promise<void> => {
            if (pending) return;
            pending = true;
            try {
                const response = await fetchStats();
                if (!active) return;
                if (response.isOk() && response.result) {
                    setData(response.result);
                    setError(undefined);
                } else {
                    setError(response.message);
                    rockIt.notificationManager.notifyError(response.message);
                }
            } catch {
                if (active) {
                    setError(errorMessage);
                    rockIt.notificationManager.notifyError(errorMessage);
                }
            } finally {
                pending = false;
                if (active) setLoading(false);
            }
        };
        const onListened = (): void => void refresh();
        const schedule = (): void => {
            clearInterval(interval);
            interval = undefined;
            if (rockIt.mediaPlayerManager.playingAtom.get())
                interval = setInterval(() => void refresh(), 15_000);
        };
        const unsubscribe =
            rockIt.mediaPlayerManager.playingAtom.listen(schedule);
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.MediaListened,
            onListened
        );
        schedule();
        void refresh();
        return () => {
            active = false;
            clearInterval(interval);
            unsubscribe();
            rockIt.webSocketManager.offMessage(
                EWebSocketMessage.MediaListened,
                onListened
            );
        };
    }, [fetchStats, errorMessage]);

    return { data, loading, error };
}
