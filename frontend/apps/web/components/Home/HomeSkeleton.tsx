import type { JSX } from "react";

export default function HomeSkeleton(): JSX.Element {
    return (
        <div className="flex min-h-screen flex-col">
            <div className="relative flex min-h-[90vh] flex-col overflow-hidden px-6 pt-20 pb-8 md:px-12 md:py-8">
                <div className="skeleton mb-8 h-5 w-48 rounded md:mb-12" />

                <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="flex min-h-56 w-full flex-col justify-end rounded-2xl bg-zinc-900 p-5"
                        >
                            <div className="skeleton mb-2 h-3 w-20 rounded" />
                            <div className="skeleton mb-1 h-6 w-3/4 rounded" />
                            <div className="skeleton mb-6 h-4 w-1/2 rounded" />
                            <div className="flex items-center justify-between">
                                <div className="skeleton h-14 w-14 rounded-lg" />
                                <div className="skeleton h-12 w-12 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-8 px-6 md:px-12">
                {[0, 1, 2, 3].map((section) => (
                    <div key={section}>
                        <div className="skeleton mb-4 h-7 w-48 rounded" />
                        <div className="flex gap-4 overflow-hidden">
                            {[0, 1, 2, 3, 4].map((card) => (
                                <div
                                    key={card}
                                    className="flex-none"
                                    style={{ width: 160 }}
                                >
                                    <div className="skeleton mb-2 aspect-square w-full rounded-lg" />
                                    <div className="skeleton mb-1 h-4 w-3/4 rounded" />
                                    <div className="skeleton h-3 w-1/2 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
