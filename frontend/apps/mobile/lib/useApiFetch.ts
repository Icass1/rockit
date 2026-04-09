import { useEffect, useState } from "react";
import { z } from "zod";
import { apiGet } from "./api";

export function useApiFetch<T>(
    path: string,
    schema: { parse: (data: unknown) => T }
): { data: T | null; loading: boolean; error: string | null } {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log("useApiFetch.useEffect", path);
        let cancelled = false;
        setLoading(true);
        setError(null);
        apiGet(path, schema)
            .then((result) => {
                if (!cancelled) {
                    setData(result);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    if (err instanceof z.ZodError) {
                        setError(err.message);
                    } else {
                        setError(
                            err instanceof Error ? err.message : "Fetch error"
                        );
                    }
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [path, schema]);

    return { data, loading, error };
}

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
