"use client";

import { JSX, ReactNode } from "react";

interface StatsSectionProps {
    title: string;
    children: ReactNode;
    backgroundImage?: string;
}

export default function StatsSection({
    title,
    children,
    backgroundImage,
}: StatsSectionProps): JSX.Element {
    return (
        <div className="relative">
            {backgroundImage && (
                <div className="pointer-events-none absolute -inset-16 -z-10 overflow-hidden">
                    <img
                        src={backgroundImage}
                        alt=""
                        className="h-full w-full object-cover blur-[120px] opacity-[0.1] saturate-150"
                        aria-hidden
                    />
                </div>
            )}
            <h3 className="mb-6 text-xs font-bold tracking-[0.2em] text-neutral-500 uppercase">
                {title}
            </h3>
            {children}
        </div>
    );
}
