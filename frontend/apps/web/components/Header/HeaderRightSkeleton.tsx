import type { JSX } from "react";

export default function HeaderRightSkeleton(): JSX.Element {
    return (
        <div
            className="relative ml-auto flex items-center gap-5"
            aria-hidden="true"
        >
            <div className="skeleton h-7 w-11 rounded-lg" />
            <div className="skeleton h-7 w-16 rounded-lg" />
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-1.5">
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-3.5 w-3.5 rounded" />
                <div className="skeleton h-9 w-9 rounded-full" />
            </div>
        </div>
    );
}
