"use client";

import { JSX, useCallback, useEffect, useRef, useState } from "react";
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
import { useVocabulary } from "@/components/providers/VocabularyProvider";

type MediaTypeMeta = {
    icon: typeof Music2;
    badge: string;
    vocabularyKey: keyof Vocabulary;
};

const TYPE_META: Record<EMediaType, MediaTypeMeta> = {
    [EMediaType.Song]: {
        icon: Music2,
        badge: "bg-info/15 text-info-foreground",
        vocabularyKey: "SONG",
    },
    [EMediaType.Album]: {
        icon: Disc3,
        badge: "bg-highlight/15 text-highlight-soft",
        vocabularyKey: "ALBUM",
    },
    [EMediaType.Artist]: {
        icon: Mic2,
        badge: "bg-warning/15 text-warning-foreground",
        vocabularyKey: "ARTIST",
    },
    [EMediaType.Playlist]: {
        icon: ListMusic,
        badge: "bg-success/15 text-success-foreground",
        vocabularyKey: "PLAYLIST",
    },
    [EMediaType.Video]: {
        icon: Video,
        badge: "bg-primary/15 text-primary-soft",
        vocabularyKey: "VIDEO",
    },
    [EMediaType.Radio]: {
        icon: Radio,
        badge: "bg-success/15 text-success-foreground",
        vocabularyKey: "RADIO",
    },
    [EMediaType.Station]: {
        icon: Radio,
        badge: "bg-success/15 text-success-foreground",
        vocabularyKey: "RADIO_STATION",
    },
};

function ResultRow({ item }: { item: AdminSearchResultItem }): JSX.Element {
    const $vocabulary = useVocabulary();
    const meta = TYPE_META[item.type as EMediaType];
    const Icon = meta.icon;
    const [imgError, setImgError] = useState(false);
    const showImage = item.imageUrl && !imgError;

    return (
        <div className="border-border-subtle bg-secondary hover:border-border flex items-center gap-4 rounded-xl border p-3 transition">
            <div className="bg-muted relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                {showImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.imageUrl as string}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(): void => setImgError(true)}
                    />
                ) : (
                    <Icon className="text-subtle-foreground h-5 w-5" />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-foreground-strong truncate font-medium">
                    {item.name}
                </p>
                {item.subtitle && (
                    <p className="text-muted-foreground truncate text-sm">
                        {item.subtitle}
                    </p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span
                        className={`rounded-full px-2 py-0.5 font-medium ${meta.badge}`}
                    >
                        {$vocabulary[meta.vocabularyKey]}
                    </span>
                    <span className="bg-muted text-foreground rounded-full px-2 py-0.5">
                        {item.provider}
                    </span>
                    {item.publicId && (
                        <span className="text-disabled-foreground truncate font-mono">
                            {item.publicId}
                        </span>
                    )}
                </div>
            </div>

            <div className="shrink-0 text-right">
                <span className="bg-muted text-muted-foreground rounded-lg px-2.5 py-1 font-mono text-xs">
                    {item.score.toFixed(2)}
                </span>
            </div>
        </div>
    );
}

export default function AdminMediaSearch(): JSX.Element {
    const $vocabulary = useVocabulary();

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
                <h1 className="text-foreground-strong text-2xl font-bold">
                    {$vocabulary.ADMIN_SEARCH_TITLE}
                </h1>
                <p className="text-subtle-foreground mt-1 text-sm">
                    {$vocabulary.ADMIN_SEARCH_SUBTITLE}
                </p>
            </div>

            <div className="relative mb-6">
                <Search className="text-subtle-foreground pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
                <input
                    id="admin-media-search"
                    type="text"
                    value={query}
                    onChange={(e): void => setQuery(e.target.value)}
                    placeholder={$vocabulary.ADMIN_SEARCH_PLACEHOLDER}
                    autoComplete="off"
                    className="border-border bg-secondary text-foreground-strong placeholder-subtle-foreground focus:border-primary focus:ring-primary w-full rounded-xl border py-3 pr-12 pl-12 text-sm transition outline-none focus:ring-1"
                />
                {loading && (
                    <Loader2 className="text-subtle-foreground absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 animate-spin" />
                )}
            </div>

            {error && (
                <p className="text-destructive-soft mb-4 text-sm">{error}</p>
            )}

            {results && results.length > 0 && (
                <>
                    <p className="text-subtle-foreground mb-3 text-xs">
                        {results.length} {$vocabulary.ADMIN_SEARCH_RESULTS}
                    </p>
                    <div className="space-y-2">
                        {results.map((item): JSX.Element => (
                            <ResultRow
                                key={`${item.type}-${item.provider}-${item.internalId}`}
                                item={item}
                            />
                        ))}
                    </div>
                </>
            )}

            {hasSearched && !loading && !error && results?.length === 0 && (
                <div className="border-border-subtle bg-secondary flex flex-col items-center justify-center rounded-xl border py-20">
                    <Search className="text-disabled-foreground mb-4 h-12 w-12" />
                    <p className="text-subtle-foreground">
                        {$vocabulary.ADMIN_SEARCH_NO_RESULTS}
                    </p>
                </div>
            )}

            {!hasSearched && !loading && !error && (
                <div className="border-border-subtle bg-secondary flex flex-col items-center justify-center rounded-xl border py-20">
                    <Search className="text-disabled-foreground mb-4 h-12 w-12" />
                    <p className="text-subtle-foreground">
                        {$vocabulary.ADMIN_SEARCH_PROMPT}
                    </p>
                </div>
            )}
        </div>
    );
}
