import type { JSX } from "react";

/*
 * Skeleton loader for the Library screen.
 *
 * Mirrors the visual layout of the real screen (featured pill row + section
 * header + a responsive grid of cover cards) using the shared `.skeleton`
 * utility class. This is intentionally lightweight — no extra dependencies —
 * and degrades gracefully on mobile where the grid collapses.
 */
export default function LibrarySkeleton(): JSX.Element {
    return (
        <div className="mx-4 flex min-h-screen flex-col">
            {/* Header titles */}
            <div className="mb-6 pb-4">
                <div className="skeleton mb-3 h-9 w-48 rounded" />
                <div className="skeleton h-4 w-64 rounded" />
            </div>

            {/* Featured lists row (pill cards) */}
            <div className="mb-2 flex gap-4 overflow-hidden">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-40 flex-none">
                        <div className="skeleton aspect-square w-full rounded-lg" />
                        <div className="skeleton mt-2 h-3 w-3/4 rounded" />
                        <div className="skeleton mt-1 h-2.5 w-1/2 rounded" />
                    </div>
                ))}
            </div>

            {/* Section header placeholders */}
            <div className="flex items-center justify-between px-4 pt-6 pb-3">
                <div className="skeleton h-7 w-56 rounded" />
                <div className="flex gap-2">
                    <div className="skeleton h-8 w-8 rounded-full" />
                    <div className="skeleton h-8 w-8 rounded-full" />
                </div>
            </div>

            {/* Cover cards grid — responsive, fits a huge library perception */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-4 py-4 md:grid-cols-[repeat(auto-fill,_250px)] md:gap-x-4 md:gap-y-5">
                {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i}>
                        <div className="skeleton aspect-square w-full rounded-md" />
                        <div className="skeleton mx-auto mt-2 h-3 w-3/4 rounded" />
                        <div className="skeleton mx-auto mt-1 h-2.5 w-1/2 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
