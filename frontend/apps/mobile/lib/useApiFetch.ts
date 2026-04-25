import { useEffect, useState } from "react";
import { HttpResult } from "@rockit/shared";
import { z } from "zod";
import { apiFetch } from "./api";

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
        apiFetch(path, schema)
            .then((response) => {
                if (!response.isOk())
                    console.error(response.message, response.detail);
                if (!cancelled && response.isOk()) {
                    setData(response.result);
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

export function useApiFetch2<T>(func: () => Promise<HttpResult<T>>): {
    data: T | null;
    loading: boolean;
    error: string | null;
} {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        func()
            .then((data) => {
                setLoading(false);
                if (!data.isOk) {
                    console.error(
                        "This should never happen 1",
                        data.message,
                        data.detail
                    );
                }
                if (data.isOk()) {
                    setData(data.result);
                    setError(null);
                } else if (data.isNotOk()) {
                    setData(null);
                    console.error(data.message, data.detail);
                    setError(data.message);
                } else {
                    setError("Critical error 1");
                    setData(null);

                    console.error(
                        "This should never happen 2",
                        data.message,
                        data.detail
                    );
                }
            })
            .catch((error) => {
                setLoading(false);
                setData(null);
                setError("Critical error 2");

                console.error("This should never happen 3", error);
            });
    }, [func]);

    return { data, loading, error };
}
