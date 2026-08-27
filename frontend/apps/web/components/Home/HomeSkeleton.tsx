import type { JSX } from "react";

export default function HomeSkeleton(): JSX.Element {
    return (
        <div className="flex min-h-screen flex-col">
            {/* Hero coverflow skeleton */}
            <div className="relative overflow-hidden px-[6%] pt-7">
                <div className="skeleton mb-2 h-4 w-16 rounded" />
                <div className="skeleton mb-1.5 h-8 w-64 rounded" />
                <div className="skeleton h-4 w-40 rounded" />

                {/* Coverflow stage placeholder */}
                <div
                    className="relative mx-auto mt-6 flex items-center justify-center"
                    style={{ height: 300 }}
                >
                    <div className="skeleton h-47.5 w-47.5 rounded-[18px]" />
                </div>

                {/* Dots placeholder */}
                <div className="flex justify-center gap-2 pb-5">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="skeleton h-1.5 w-1.5 rounded-full"
                        />
                    ))}
                </div>
            </div>

            {/* Quick selections skeleton */}
            <div className="px-6 md:pl-12">
                <div className="skeleton mb-4 h-7 w-48 rounded" />
                <div className="flex gap-4 overflow-hidden">
                    {[0, 1, 2, 3].map((col) => (
                        <div
                            key={col}
                            className="flex w-[51%] max-w-50 flex-none flex-col gap-1 md:w-[calc(25%-10px)] md:max-w-87.5"
                        >
                            {[0, 1, 2, 3].map((row) => (
                                <div
                                    key={row}
                                    className="flex items-center gap-3 rounded-lg bg-white/5 p-2"
                                >
                                    <div className="skeleton h-12 w-12 flex-none rounded" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="skeleton h-3.5 w-3/4 rounded" />
                                        <div className="skeleton h-3 w-1/2 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bento section skeletons */}
            {[0, 1, 2, 3].map((section) => (
                <div key={section} className="px-[6%] pt-8 md:px-[4%] md:pt-10">
                    <div className="skeleton mb-3.5 h-7 w-48 rounded" />
                    <div className="bento-grid">
                        {/* Large card */}
                        <div className="bento-lg skeleton rounded-2xl" />
                        {/* Small cards */}
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="skeleton rounded-2xl" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
