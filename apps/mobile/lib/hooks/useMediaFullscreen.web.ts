import { useEffect } from "react";

/** In-app fullscreen remains available when a browser cannot lock orientation. */
export function useMediaFullscreen(onClose: () => void): void {
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent): void => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            document.removeEventListener("keydown", onKey);
        };
    }, [onClose]);
}
