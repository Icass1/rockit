"use client";

import { useEffect, useRef, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { CollectionPager } from "@rockit/shared";
import { LoaderCircle } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function CollectionFooter({
    pager,
}: {
    pager: CollectionPager;
}): JSX.Element {
    const state = useStore(pager.state);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const sentinel = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const target = sentinel.current;
        if (!target || !state.hasMore || state.loading || state.error) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting))
                void pager.next();
        });
        observer.observe(target);
        return () => observer.disconnect();
    }, [pager, state.hasMore, state.loading, state.error, state.media.length]);
    return (
        <div
            ref={sentinel}
            role="status"
            aria-live="polite"
            aria-busy={state.loading}
            className="flex min-h-12 items-center justify-center gap-2 py-3 text-sm text-neutral-400"
        >
            {state.loading && (
                <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
            )}
            <span>
                {state.media.length} / {state.total}
            </span>
            {state.error && (
                <button type="button" onClick={() => void pager.retry()}>
                    {vocabulary.RETRY}
                </button>
            )}
        </div>
    );
}
