import { useEffect, useState } from "react";
import {
    UserStatsResponseSchema,
    type UserStatsResponse,
} from "@rockit/shared";
import { apiFetch } from "@/lib/api";

export type Range = "7d" | "30d" | "1y" | "custom";

interface UseUserStatsOptions {
    range: Range;
    customStart?: string;
    customEnd?: string;
}

export function useUserStats({
    range,
    customStart,
    customEnd,
}: UseUserStatsOptions): {
    data: UserStatsResponse | null;
    loading: boolean;
    error: string | null;
} {
    const [data, setData] = useState<UserStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const params = new URLSearchParams({ range });
        if (range === "custom" && customStart && customEnd) {
            params.set("start", customStart);
            params.set("end", customEnd);
        }

        setLoading(true);
        apiFetch(`/stats/user?${params.toString()}`, UserStatsResponseSchema)
            .then((response) => {
                if (response.isNotOk()) {
                    console.error(response.message, response.detail);
                }
                if (!cancelled && response.isOk()) {
                    setData(response.result);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [range, customStart, customEnd]);

    return { data, loading, error };
}
