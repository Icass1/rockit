"use client";

import { JSX, ReactNode, useState } from "react";
import type { TPlayableMedia } from "@rockit/shared";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { shouldKeepVinyl } from "@/lib/managers/playerUIManager";

export default function VinylTransition({
    media,
    children,
}: {
    media: TPlayableMedia;
    children: ReactNode;
}): JSX.Element {
    const reducedMotion = useReducedMotion();
    const [transitioning, setTransitioning] = useState(false);
    const [previous, setPrevious] = useState({ media, key: 0 });
    let key = previous.key;
    if (previous.media !== media) {
        // Compare the displayed track with the actual destination, so forward,
        // backward and shuffled navigation all preserve the same physical disc.
        if (!shouldKeepVinyl(previous.media, media)) key++;
        setPrevious({ media, key });
    }

    return (
        <div className="relative h-full w-full overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
                <motion.div
                    key={key}
                    className="h-full w-full"
                    initial={{ y: reducedMotion ? 0 : "-100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: reducedMotion ? 0 : "100%" }}
                    transition={{
                        duration: reducedMotion ? 0 : 0.4,
                        ease: [0.45, 0, 0.2, 1],
                    }}
                    onAnimationStart={() => setTransitioning(true)}
                    onAnimationComplete={() => setTransitioning(false)}
                >
                    {children}
                </motion.div>
            </AnimatePresence>
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20 border-y border-white/30 transition-opacity duration-150 motion-reduce:transition-none"
                style={{ opacity: transitioning && !reducedMotion ? 1 : 0 }}
            />
        </div>
    );
}
