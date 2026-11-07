"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Scoped resource: refresh races and work finishing after unmount are ignored. */
export function useAsyncResource<T>(load: () => Promise<T>) {
    const loader = useRef(load);
    loader.current = load;
    const generation = useRef(0);
    const mounted = useRef(false);
    const [state, setState] = useState<{
        data?: T;
        loading: boolean;
        error?: Error;
    }>({ loading: true });
    const refresh = useCallback(async () => {
        const stamp = ++generation.current;
        if (mounted.current)
            setState((previous) => ({
                ...previous,
                loading: true,
                error: undefined,
            }));
        try {
            const data = await loader.current();
            if (mounted.current && stamp === generation.current)
                setState({ data, loading: false });
        } catch (error) {
            if (mounted.current && stamp === generation.current)
                setState({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error
                            : new Error(String(error)),
                });
        }
    }, []);
    useEffect(() => {
        mounted.current = true;
        void refresh();
        return () => {
            mounted.current = false;
            generation.current++;
        };
    }, [refresh]);
    return { ...state, refresh };
}
