"use client";

import { type JSX, type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

export default function FadeInOnView({
    children,
    delay = 0,
}: {
    children: ReactNode;
    delay?: number;
}): JSX.Element {
    const [ref, inView] = useInView<HTMLDivElement>();

    return (
        <div
            ref={ref}
            className={`transition-all duration-500 ease-out ${
                inView
                    ? "translate-y-0 opacity-100"
                    : "translate-y-3 opacity-0"
            }`}
            style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
        >
            {children}
        </div>
    );
}
