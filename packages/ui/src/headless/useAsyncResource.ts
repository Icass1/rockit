"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Scoped resource: refresh races and work finishing after unmount are ignored. */
export function useAsyncResource<T>(
    load: () => Promise<T>,
    key?: string,
    enabled = true
) {
    const loader = useRef(load);
    loader.current = load;
    const generation = useRef(0);
    const mounted = useRef(false);
    const [state, setState] = useState<{
        key?: string;
        data?: T;
        loading: boolean;
        error?: Error;
    }>({ key, loading: true });
    const refresh = useCallback(async () => {
        const stamp = ++generation.current;
        if (mounted.current)
            setState((previous) => ({
                ...(previous.key === key ? previous : {}),
                key,
                loading: true,
                error: undefined,
            }));
        try {
            const data = await loader.current();
            if (mounted.current && stamp === generation.current)
                setState({ key, data, loading: false });
        } catch (error) {
            if (mounted.current && stamp === generation.current)
                setState({
                    key,
                    loading: false,
                    error:
                        error instanceof Error
                            ? error
                            : new Error(String(error)),
                });
        }
    }, [key]);
    useEffect(() => {
        mounted.current = true;
        if (enabled) void refresh();
        return () => {
            mounted.current = false;
            generation.current++;
        };
    }, [refresh, enabled]);
    if (!enabled)
        return { data: undefined, loading: false, error: undefined, refresh };
    return state.key === key
        ? { ...state, refresh }
        : { data: undefined, loading: true, error: undefined, refresh };
}
