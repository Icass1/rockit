import { type JSX } from "react";

export default function DownloadSkeleton(): JSX.Element {
    return (
        <div className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
            <div className="space-y-4">
                <div className="h-7 w-40 animate-pulse rounded bg-neutral-800" />
                <div className="h-4 w-64 animate-pulse rounded bg-neutral-800" />
                <div className="h-12 w-full animate-pulse rounded-md bg-neutral-800" />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-20 animate-pulse rounded-lg bg-neutral-800"
                    />
                ))}
                <div className="col-span-2 h-24 animate-pulse rounded-lg bg-neutral-800 sm:col-span-4" />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="aspect-square animate-pulse rounded-lg bg-neutral-800" />
                        <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-800" />
                        <div className="h-2 w-1/2 animate-pulse rounded bg-neutral-800" />
                    </div>
                ))}
            </div>
        </div>
    );
}
