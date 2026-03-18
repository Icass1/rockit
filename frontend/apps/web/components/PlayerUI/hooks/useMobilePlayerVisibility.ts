import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

/**
 * Manages the show/hide animation state of MobilePlayerUI.
 *
 * Returns:
 * - `hidden`   — when true, render `display: none` (element is fully off-screen)
 * - `atTop`    — when true, the player is at top: 0 (fully visible)
 * - `animated` — when true, attach the `transition-[top]` class
 */
export function useMobilePlayerVisibility() {
    const $visible = useStore(rockIt.playerUIManager.visibleAtom);

    const [hidden, setHidden] = useState(!$visible);
    const [atTop, setAtTop] = useState($visible);
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        // Run on next animation frame so the transition actually fires.
        // Using rAF + a small delay is more reliable than double-setTimeout
        // because it guarantees the element is in the DOM before the class flip.
        const raf = requestAnimationFrame(() => {
            setAnimated(true);

            if ($visible) {
                setHidden(false);
                // Give the browser one frame to paint the element before animating
                requestAnimationFrame(() => setAtTop(true));
            } else {
                setAtTop(false);
                // Wait for the 300ms CSS transition to finish before hiding
                const t = setTimeout(() => {
                    setHidden(true);
                    setAnimated(false);
                }, 310);
                return () => clearTimeout(t);
            }

            const t = setTimeout(() => setAnimated(false), 310);
            return () => clearTimeout(t);
        });

        return () => cancelAnimationFrame(raf);
    }, [$visible]);

    return { hidden, atTop, animated };
}
