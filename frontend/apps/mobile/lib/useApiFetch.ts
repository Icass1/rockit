import { useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch } from "./api";

export function useApiFetch<T>(
    path: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: { parse: (data: unknown) => T }
): { data: T | null; loading: boolean; error: string | null } {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        apiFetch(path)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((json) => {
                if (!cancelled) {
                    try {
                        setData(schema.parse(json) as T);
                    } catch (e) {
                        if (e instanceof z.ZodError) {
                            setError(e.message);
                        } else {
                            setError("Parse error");
                        }
                    }
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
    }, [path]);

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
