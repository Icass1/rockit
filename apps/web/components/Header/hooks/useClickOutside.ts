import { RefObject, useEffect } from "react";

export function useClickOutside(
    ref: RefObject<HTMLElement | null>,
    callback: () => void
): void {
    useEffect((): (() => void) => {
        const handler = (e: MouseEvent): void => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                callback();
            }
        };
        document.addEventListener("mousedown", handler);
        return (): void => document.removeEventListener("mousedown", handler);
    }, [ref, callback]);
}
