"use client";

import { JSX, ReactNode } from "react";

interface StatsSectionProps {
    title: string;
    children: ReactNode;
    backgroundImage?: string;
    stagger?: number;
    showDivider?: boolean;
}

export default function StatsSection({
    title,
    children,
    backgroundImage,
    stagger = 0,
    showDivider = true,
}: StatsSectionProps): JSX.Element {
    return (
        <div
            className="animate-fade-in-up"
            style={{ animationDelay: `${stagger * 100}ms` }}
        >
            {showDivider && (
                <div className="mb-8 flex items-center gap-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
                    <h3 className="shrink-0 text-base font-bold tracking-[0.25em] break-words text-neutral-500 uppercase">
                        {title}
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/5" />
                </div>
            )}

            <div className="relative">
                {backgroundImage && (
                    <div className="pointer-events-none absolute -inset-16 -z-10 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={backgroundImage}
                            alt=""
                            className="h-full w-full object-cover opacity-[0.08] blur-[120px] saturate-150"
                            aria-hidden
                        />
                    </div>
                )}
                {!showDivider && (
                    <h3 className="mb-6 text-sm font-bold tracking-[0.2em] text-neutral-500 uppercase">
                        {title}
                    </h3>
                )}
                {children}
            </div>
        </div>
    );
}
