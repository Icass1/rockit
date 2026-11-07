import type { JSX } from "react";

export default function LoadingComponent(): JSX.Element {
    return (
        <div
            className="flex h-full w-full items-center justify-center"
            aria-busy="true"
        >
            <span
                aria-hidden="true"
                className="border-border border-t-primary size-8 animate-spin rounded-full border-4 motion-reduce:animate-none"
            />
        </div>
    );
}
