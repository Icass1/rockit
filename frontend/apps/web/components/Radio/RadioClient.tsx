"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import Image from "next/image";
import { LayoutGrid, List, Search, X } from "lucide-react";
import { EViewMode } from "@/models/enums/viewMode";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { StationCard } from "@/components/Library/LibraryCards";
import { StationRow } from "@/components/Library/LibraryRows";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";
import {
    type BaseSearchResultsItem,
    type BaseStationResponse,
    type LibraryMediasResponse,
} from "@rockit/shared";
import LoadingComponent from "@/components/Loading";
import type { DebouncedFunc } from "lodash";
import debounce from "lodash/debounce";

function StationSearchCard({
    station,
}: {
    station: BaseSearchResultsItem;
}): JSX.Element {
    const handlePlay = async (): Promise<void> => {
        const publicId = station.url?.split("/").pop();
        if (publicId) {
            await rockIt.stationManager.playStationByPublicId(publicId);
        }
    };

    return (
        <div
            className="w-full cursor-pointer transition md:hover:scale-105"
            onClick={handlePlay}
        >
            <Image
                width={250}
                height={250}
                className="aspect-square w-full rounded-lg object-cover"
                src={station.imageUrl || "/radio-placeholder.png"}
                alt={station.name}
            />
            <span className="mt-2 block truncate text-center font-semibold text-white">
                {station.name}
            </span>
        </div>
    );
}

function StationSearchRow({
    station,
}: {
    station: BaseSearchResultsItem;
}): JSX.Element {
    const handlePlay = async (): Promise<void> => {
        const publicId = station.url?.split("/").pop();
        if (publicId) {
            await rockIt.stationManager.playStationByPublicId(publicId);
        }
    };

    return (
        <div
            className="flex cursor-pointer items-center gap-3 rounded p-2 transition md:hover:bg-[rgba(75,75,75,0.4)]"
            onClick={handlePlay}
        >
            <Image
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 rounded object-cover"
                src={station.imageUrl || "/radio-placeholder.png"}
                alt={station.name}
            />
            <span className="truncate text-sm font-semibold text-white">
                {station.name}
            </span>
        </div>
    );
}

export default function RadioClient(): JSX.Element {
    const [viewMode, setViewMode] = useState<EViewMode>(EViewMode.Grid);
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<
        BaseSearchResultsItem[] | undefined
    >();
    const [searching, setSearching] = useState(false);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const searchDebounce = useRef<DebouncedFunc<(q: string) => void> | null>(
        null
    );

    useEffect((): (() => void | undefined) => {
        searchDebounce.current = debounce(async (q: string): Promise<void> => {
            setSearching(true);
            const res = await Http.search({ query: q });
            if (res.isOk()) {
                const results = res.result.results ?? [];
                setSearchResults(
                    results.filter(
                        (r: BaseSearchResultsItem): boolean =>
                            r.type === "radio"
                    )
                );
            }
            setSearching(false);
        }, 300);

        return (): void | undefined => searchDebounce.current?.cancel();
    }, []);

    const fetchLibrary = useCallback(
        () => Http.getUserLibraryMedias(),
        []
    );

    const { data, loading } = useFetch(fetchLibrary);

    const libraryStations: BaseStationResponse[] =
        (data as LibraryMediasResponse | undefined)?.stations ?? [];

    const isSearching = query.trim().length > 0;
    const hasSearchResults =
        isSearching && searchResults && searchResults.length > 0;
    const showLibrary = !isSearching;

    const handleClear = (): void => {
        setQuery("");
        setSearchResults(undefined);
    };

    return (
        <div className="mx-4 flex flex-col">
            <header className="mb-6 flex items-center gap-3 py-4">
                <h1 className="text-4xl font-bold text-white select-none">
                    {$vocabulary.RADIO ?? "Radio"}
                </h1>
                <div className="relative ml-auto max-w-xs flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e): void => {
                            const q = e.target.value;
                            setQuery(q);
                            if (q === "") {
                                searchDebounce.current?.cancel();
                                setSearchResults(undefined);
                            } else {
                                searchDebounce.current?.(q);
                            }
                        }}
                        placeholder={
                            $vocabulary.RADIO_SEARCH ??
                            "Search radio stations..."
                        }
                        className="h-10 w-full rounded-full bg-neutral-900 pl-9 pr-8 text-sm font-semibold text-white placeholder-neutral-500 focus:outline-0"
                    />
                    {query && (
                        <button
                            onClick={handleClear}
                            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-neutral-400 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    {searching && (
                        <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-[#ec5588]" />
                        </div>
                    )}
                </div>
                <button
                    className="cursor-pointer rounded-md p-2 transition hover:bg-neutral-800"
                    onClick={(): void =>
                        setViewMode(
                            viewMode === EViewMode.Grid
                                ? EViewMode.List
                                : EViewMode.Grid
                        )
                    }
                    aria-label="Toggle view"
                >
                    {viewMode === EViewMode.Grid ? (
                        <List className="h-5 w-5 text-neutral-400" />
                    ) : (
                        <LayoutGrid className="h-5 w-5 text-neutral-400" />
                    )}
                </button>
            </header>

            {loading && <LoadingComponent />}

            {!loading && showLibrary && libraryStations.length > 0 && (
                viewMode === EViewMode.Grid ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {libraryStations.map((station) => (
                            <StationCard
                                key={station.publicId}
                                station={station}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {libraryStations.map((station) => (
                            <StationRow
                                key={station.publicId}
                                station={station}
                            />
                        ))}
                    </div>
                )
            )}

            {!loading && showLibrary && libraryStations.length === 0 && (
                <div className="py-16 text-center text-neutral-500">
                    {$vocabulary.NO_STATIONS ??
                        "No radio stations found"}
                </div>
            )}

            {isSearching && searching && !searchResults && (
                <div className="flex items-center justify-center py-16 text-neutral-400">
                    <span className="animate-pulse text-lg font-semibold">
                        {$vocabulary.SEARCH ?? "Searching..."}
                    </span>
                </div>
            )}

            {hasSearchResults && (
                viewMode === EViewMode.Grid ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {searchResults!.map((station) => (
                            <StationSearchCard
                                key={station.providerUrl + station.name}
                                station={station}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {searchResults!.map((station) => (
                            <StationSearchRow
                                key={station.providerUrl + station.name}
                                station={station}
                            />
                        ))}
                    </div>
                )
            )}

            {isSearching && !searching && searchResults?.length === 0 && (
                <div className="py-16 text-center text-neutral-500">
                    {$vocabulary.NO_RESULTS ?? "No results found"}
                </div>
            )}
        </div>
    );
}
