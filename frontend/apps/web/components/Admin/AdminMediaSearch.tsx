"use client";

import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import {
    EMediaType,
    type AdminSearchResultItem,
    type Vocabulary,
} from "@rockit/shared";
import {
    Disc3,
    ListMusic,
    Loader2,
    Mic2,
    Music2,
    Radio,
    Search,
    Video,
} from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

type MediaTypeMeta = {
    icon: typeof Music2;
    badge: string;
    vocabularyKey: keyof Vocabulary;
};

const TYPE_META: Record<EMediaType, MediaTypeMeta> = {
    [EMediaType.Song]: {
        icon: Music2,
        badge: "bg-sky-500/15 text-sky-300",
        vocabularyKey: "SONG",
    },
    [EMediaType.Album]: {
        icon: Disc3,
        badge: "bg-violet-500/15 text-violet-300",
        vocabularyKey: "ALBUM",
    },
    [EMediaType.Artist]: {
        icon: Mic2,
        badge: "bg-amber-500/15 text-amber-300",
        vocabularyKey: "ARTIST",
    },
    [EMediaType.Playlist]: {
        icon: ListMusic,
        badge: "bg-emerald-500/15 text-emerald-300",
        vocabularyKey: "PLAYLIST",
    },
    [EMediaType.Video]: {
        icon: Video,
        badge: "bg-rose-500/15 text-rose-300",
        vocabularyKey: "VIDEO",
    },
    [EMediaType.Radio]: {
        icon: Radio,
        badge: "bg-teal-500/15 text-teal-300",
        vocabularyKey: "RADIO",
    },
    [EMediaType.Station]: {
        icon: Radio,
        badge: "bg-teal-500/15 text-teal-300",
        vocabularyKey: "RADIO_STATION",
    },
};

function ResultRow({ item }: { item: AdminSearchResultItem }): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const meta = TYPE_META[item.type as EMediaType];
    const Icon = meta.icon;
    const [imgError, setImgError] = useState(false);
    const showImage = item.imageUrl && !imgError;

    return (
        <div className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-3 transition hover:border-neutral-700">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-800">
                {showImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.imageUrl as string}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(): void => setImgError(true)}
                    />
                ) : (
                    <Icon className="h-5 w-5 text-neutral-500" />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{item.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span
                        className={`rounded-full px-2 py-0.5 font-medium ${meta.badge}`}
                    >
                        {$vocabulary[meta.vocabularyKey]}
                    </span>
                    <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-neutral-300">
                        {item.provider}
                    </span>
                    {item.publicId && (
                        <span className="truncate font-mono text-neutral-600">
                            {item.publicId}
                        </span>
                    )}
                </div>
            </div>

            <div className="shrink-0 text-right">
                <span className="rounded-lg bg-neutral-800 px-2.5 py-1 font-mono text-xs text-neutral-400">
                    {item.score.toFixed(2)}
                </span>
            </div>
        </div>
    );
}

export default function AdminMediaSearch(): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<AdminSearchResultItem[] | null>(
        null
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const requestIdRef = useRef(0);

    const runSearch = useCallback(async (value: string): Promise<void> => {
        const trimmed = value.trim();
        const requestId = ++requestIdRef.current;

        if (!trimmed) {
            setResults(null);
            setError(null);
            setLoading(false);
            setHasSearched(false);
            return;
        }

        setLoading(true);
        setError(null);

        const response = await Http.searchMedia(trimmed);

        // Ignore stale responses from earlier keystrokes.
        if (requestId !== requestIdRef.current) return;

        setLoading(false);
        setHasSearched(true);

        if (response.isOk()) {
            setResults(response.result.results);
        } else {
            setResults(null);
            setError(
                typeof response.detail === "string"
                    ? response.detail
                    : response.message
            );
        }
    }, []);

    useEffect((): (() => void) => {
        const handle = setTimeout((): void => {
            void runSearch(query);
        }, 300);
        return (): void => clearTimeout(handle);
    }, [query, runSearch]);

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">
                    {$vocabulary.ADMIN_SEARCH_TITLE}
                </h1>
                <p className="mt-1 text-sm text-neutral-500">
                    {$vocabulary.ADMIN_SEARCH_SUBTITLE}
                </p>
            </div>

            <div className="relative mb-6">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-neutral-500" />
                <input
                    id="admin-media-search"
                    type="text"
                    value={query}
                    onChange={(e): void => setQuery(e.target.value)}
                    placeholder={$vocabulary.ADMIN_SEARCH_PLACEHOLDER}
                    autoComplete="off"
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 py-3 pr-12 pl-12 text-sm text-white placeholder-neutral-500 transition outline-none focus:border-(--color-rockit-pink) focus:ring-1 focus:ring-(--color-rockit-pink)"
                />
                {loading && (
                    <Loader2 className="absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 animate-spin text-neutral-500" />
                )}
            </div>

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            {results && results.length > 0 && (
                <>
                    <p className="mb-3 text-xs text-neutral-500">
                        {results.length} {$vocabulary.ADMIN_SEARCH_RESULTS}
                    </p>
                    <div className="space-y-2">
                        {results.map(
                            (item): JSX.Element => (
                                <ResultRow
                                    key={`${item.type}-${item.provider}-${item.internalId}`}
                                    item={item}
                                />
                            )
                        )}
                    </div>
                </>
            )}

            {hasSearched && !loading && !error && results?.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 py-20">
                    <Search className="mb-4 h-12 w-12 text-neutral-600" />
                    <p className="text-neutral-500">
                        {$vocabulary.ADMIN_SEARCH_NO_RESULTS}
                    </p>
                </div>
            )}

            {!hasSearched && !loading && !error && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 py-20">
                    <Search className="mb-4 h-12 w-12 text-neutral-600" />
                    <p className="text-neutral-500">
                        {$vocabulary.ADMIN_SEARCH_PROMPT}
                    </p>
                </div>
            )}
        </div>
    );
}
