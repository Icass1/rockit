"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@nanostores/react";
import type { DebouncedFunc } from "lodash";
import debounce from "lodash/debounce";
import { ListPlus, Play, SearchX } from "lucide-react";
import type { Station } from "@/types/station";
import { useLanguage } from "@/contexts/LanguageContext";
import { rockIt } from "@/lib/rockit/rockIt";
import { baseApiFetch } from "@/lib/utils/apiFetch";

function StationCard({ station }: { station: Station }) {
    const handlePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        rockIt.stationManager.setAndPlayStation(station);
    };

    const coverSrc = station.favicon
        ? `proxy?url=${encodeURIComponent(station.favicon)}`
        : rockIt.STATION_PLACEHOLDER_IMAGE_URL;

    const tags = station.tags
        ? station.tags
              .split(",")
              .slice(0, 3)
              .map((t) => t.trim())
              .filter(Boolean)
              .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
              .join(", ")
        : null;

    return (
        <div
            role="button"
            aria-label={`Play ${station.name}`}
            tabIndex={0}
            className="flex h-32 cursor-pointer items-center gap-3 rounded-md bg-neutral-800 px-4 py-2 shadow-md transition hover:bg-neutral-700"
            onClick={handlePlay}
            onKeyDown={(e) => e.key === "Enter" && handlePlay()}
        >
            <div className="relative aspect-square h-full min-w-14 shrink-0 overflow-hidden rounded-md md:h-24 md:min-w-24">
                <Image
                    src={coverSrc}
                    alt={`${station.name} cover`}
                    fill
                    className="object-cover"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                            rockIt.STATION_PLACEHOLDER_IMAGE_URL;
                    }}
                />
            </div>

            <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-base font-semibold text-white md:text-lg">
                    {station.name}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-sm text-neutral-400">
                    {station.country || "Unknown"}
                </p>
                {tags && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
                        {tags}
                    </p>
                )}
            </div>

            <button
                aria-label="Add to library"
                className="shrink-0 rounded-full bg-neutral-700 p-2 text-white transition hover:bg-neutral-500"
                onClick={(e) => e.stopPropagation()}
            >
                <ListPlus className="h-5 w-5" />
            </button>

            <button
                aria-label={`Play ${station.name}`}
                className="hidden shrink-0 rounded-full bg-pink-500 p-3 text-white transition hover:bg-pink-600 md:flex"
                onClick={handlePlay}
            >
                <Play className="h-5 w-5 fill-current" />
            </button>
        </div>
    );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
    const { langFile: lang } = useLanguage();
    if (!lang) return null;

    return (
        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <SearchX className="mb-4 h-16 w-16 text-neutral-500" />
            <p className="text-xl font-semibold text-white">
                {hasQuery ? lang.radio_empty1 : lang.radio_search}
            </p>
            {hasQuery && (
                <p className="mt-2 text-neutral-400">{lang.radio_empty2}</p>
            )}
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="h-32 animate-pulse rounded-md bg-neutral-800"
                />
            ))}
        </div>
    );
}

export default function RadioClient() {
    const { langFile: lang } = useLanguage();
    const $currentStation = useStore(rockIt.stationManager.currentStationAtom);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialQuery = searchParams.get("q") ?? "";
    const [query, setQuery] = useState(initialQuery);
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debounceRef = useRef<DebouncedFunc<(q: string) => void> | null>(null);

    const fetchStations = useCallback(async (searchTerm: string) => {
        if (!searchTerm.trim()) {
            setStations([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await baseApiFetch(
                `/radio/stations/byname/${encodeURIComponent(searchTerm)}?limit=20`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: Station[] = await res.json();
            setStations(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        debounceRef.current = debounce(fetchStations, 400);
        return () => debounceRef.current?.cancel();
    }, [fetchStations]);

    useEffect(() => {
        if (initialQuery) fetchStations(initialQuery);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        const params = new URLSearchParams(searchParams);
        if (value) params.set("q", value);
        else params.delete("q");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });

        debounceRef.current?.(value);
    };

    if (!lang) return null;

    return (
        <div className="h-full overflow-y-auto p-3 pb-20 pt-16 text-white md:pb-24 md:pt-24">
            <h1 className="my-6 select-none text-center text-2xl font-bold md:text-3xl">
                {lang.radio_stations} 📻
            </h1>

            {$currentStation && (
                <div className="mx-auto mb-6 flex max-w-md items-center gap-3 rounded-lg bg-pink-500/20 px-4 py-3 ring-1 ring-pink-500/40">
                    <span className="relative flex h-3 w-3 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-pink-500" />
                    </span>
                    <p className="min-w-0 truncate text-sm font-medium text-pink-200">
                        {$currentStation.name}
                    </p>
                    <button
                        className="ml-auto shrink-0 text-xs text-pink-400 transition hover:text-white"
                        onClick={() => rockIt.stationManager.clearStation()}
                    >
                        Stop
                    </button>
                </div>
            )}

            <div className="mx-auto mb-6 max-w-md">
                <input
                    type="search"
                    placeholder={lang.radio_search}
                    value={query}
                    onChange={handleChange}
                    className="w-full rounded-full border border-neutral-700 bg-neutral-800 px-5 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
            </div>

            {error && (
                <p className="mb-4 text-center text-sm text-red-400">
                    Error: {error}
                </p>
            )}

            {loading ? (
                <LoadingSkeleton />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {stations.length > 0 ? (
                        stations.map((station) => (
                            <StationCard
                                key={station.stationuuid}
                                station={station}
                            />
                        ))
                    ) : (
                        <EmptyState hasQuery={!!query} />
                    )}
                </div>
            )}

            <div className="h-10" />
        </div>
    );
}
