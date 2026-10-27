"use client";

import { JSX, ReactNode, useState } from "react";
import type { TPlayableMedia } from "@rockit/shared";
import {
    AnimatePresence,
    motion,
    useReducedMotion,
    type Variants,
} from "framer-motion";
import { shouldKeepVinyl } from "@/lib/managers/playerUIManager";

export default function VinylTransition({
    media,
    direction,
    children,
}: {
    media: TPlayableMedia;
    direction: 1 | -1;
    children: ReactNode;
}): JSX.Element {
    const reducedMotion = useReducedMotion();
    const [previous, setPrevious] = useState({ media, key: 0 });
    let key = previous.key;
    if (previous.media !== media) {
        // Compare the displayed track with the actual destination, so forward,
        // backward and shuffled navigation all preserve the same physical disc.
        if (!shouldKeepVinyl(previous.media, media)) key++;
        setPrevious({ media, key });
    }

    const slideVariants: Variants = {
        enter: (navigation: 1 | -1) => ({
            y: reducedMotion ? 0 : navigation === 1 ? "100%" : "-100%",
        }),
        center: { y: 0 },
        exit: (navigation: 1 | -1) => ({
            y: reducedMotion ? 0 : navigation === 1 ? "-100%" : "100%",
        }),
    };

    return (
        <div className="relative h-full w-full overflow-hidden">
            <AnimatePresence initial={false} mode="sync" custom={direction}>
                <motion.div
                    key={key}
                    custom={direction}
                    variants={slideVariants}
                    className="absolute inset-0 h-full w-full"
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        duration: reducedMotion ? 0 : 0.4,
                        ease: [0.45, 0, 0.2, 1],
                    }}
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
