"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import {
    EMediaContextLocation,
    type BaseSearchResultsItem,
    type BaseStationResponse,
    type LibraryMediasResponse,
} from "@rockit/shared";
import type { DebouncedFunc } from "lodash";
import debounce from "lodash/debounce";
import { Globe, LayoutGrid, List as ListIcon, Search, X } from "lucide-react";
import { EViewMode } from "@/models/enums/viewMode";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { StationCard } from "@/components/Library/LibraryCards";
import LoadingComponent from "@/components/Loading";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

const RadioMap = dynamic(() => import("@/components/Radio/RadioMap"), {
    ssr: false,
    loading: () => (
        <div className="skeleton h-75 w-full rounded-2xl md:h-100" />
    ),
});

function StationSearchCard({
    station,
}: {
    station: BaseSearchResultsItem;
}): JSX.Element {
    const [imgSrc, setImgSrc] = useState(
        station.imageUrl || "/radio-placeholder.png"
    );

    const handlePlay = async (): Promise<void> => {
        const publicId = station.url?.split("/").pop();
        if (publicId) {
            await rockIt.stationManager.playStationByPublicId(publicId);
        }
    };

    return (
        <MediaContextMenu
            media={station}
            location={EMediaContextLocation.SEARCH}
            openOnLeftClick={false}
        >
            <div
                className="w-full cursor-pointer transition md:hover:scale-105"
                onClick={handlePlay}
            >
                <Image
                    width={250}
                    height={250}
                    className="aspect-square w-full rounded-lg object-cover select-none"
                    src={imgSrc}
                    alt={station.name}
                    loading="lazy"
                    unoptimized
                    onError={(): void => setImgSrc("/radio-placeholder.png")}
                />
                <span className="mt-2 block truncate text-center font-semibold text-white">
                    {station.name}
                </span>
            </div>
        </MediaContextMenu>
    );
}

function StationSearchRow({
    station,
}: {
    station: BaseSearchResultsItem;
}): JSX.Element {
    const [imgSrc, setImgSrc] = useState(
        station.imageUrl || "/radio-placeholder.png"
    );

    const handlePlay = async (): Promise<void> => {
        const publicId = station.url?.split("/").pop();
        if (publicId) {
            await rockIt.stationManager.playStationByPublicId(publicId);
        }
    };

    return (
        <MediaContextMenu
            media={station}
            location={EMediaContextLocation.SEARCH}
            openOnLeftClick={false}
        >
            <div
                className="flex cursor-pointer items-center gap-3 rounded p-2 transition md:hover:bg-[rgba(75,75,75,0.4)]"
                onClick={handlePlay}
            >
                <Image
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded object-cover select-none"
                    src={imgSrc}
                    alt={station.name}
                    loading="lazy"
                    unoptimized
                    onError={(): void => setImgSrc("/radio-placeholder.png")}
                />
                <span className="truncate text-sm font-semibold text-white">
                    {station.name}
                </span>
            </div>
        </MediaContextMenu>
    );
}

type RadioViewMode = EViewMode.Grid | EViewMode.List | "map";

export default function RadioClient(): JSX.Element {
    const [viewMode, setViewMode] = useState<RadioViewMode>(EViewMode.Grid);
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<
        BaseSearchResultsItem[] | undefined
    >();
    const [searching, setSearching] = useState(false);
    const [countryStations, setCountryStations] = useState<
        BaseStationResponse[] | null
    >(null);
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [loadingCountry, setLoadingCountry] = useState(false);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const searchDebounce = useRef<DebouncedFunc<(q: string) => void> | null>(
        null
    );

    useEffect((): (() => void | undefined) => {
        searchDebounce.current = debounce(async (q: string): Promise<void> => {
            setSearching(true);
            setCountryStations(null);
            setSelectedCountry(null);
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

    const fetchLibrary = useCallback(() => Http.getUserLibraryMedias(), []);

    const { data, loading } = useFetch(fetchLibrary);

    const libraryStations: BaseStationResponse[] =
        (data as LibraryMediasResponse | undefined)?.stations ?? [];

    const isSearching = query.trim().length > 0;

    const handleClear = (): void => {
        setQuery("");
        setSearchResults(undefined);
        setCountryStations(null);
        setSelectedCountry(null);
    };

    const handleCountryClick = async (countryName: string): Promise<void> => {
        setSelectedCountry(countryName);
        setLoadingCountry(true);
        setSearchResults(undefined);
        setQuery("");

        try {
            const res = await Http.getStationsByCountry(countryName);
            if (res.isOk()) {
                setCountryStations(res.result);
            } else {
                setCountryStations([]);
            }
        } catch {
            setCountryStations([]);
        }

        setLoadingCountry(false);
    };

    const stationsRef = useRef<HTMLDivElement>(null);

    useEffect((): (() => void) | void => {
        if (!loadingCountry && countryStations && countryStations.length > 0) {
            const t = setTimeout(() => {
                requestAnimationFrame(() => {
                    document
                        .getElementById("main-scroll-container")
                        ?.scrollBy({ top: 500, behavior: "smooth" });
                });
            }, 100);
            return (): void => clearTimeout(t);
        }
    }, [loadingCountry, countryStations]);

    const displayedStations: (BaseStationResponse | BaseSearchResultsItem)[] = (
        countryStations ??
        searchResults ??
        libraryStations
    )
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));

    const showEmptyState =
        !loading &&
        !loadingCountry &&
        !isSearching &&
        !selectedCountry &&
        libraryStations.length === 0;

    const cycleViewMode = (): void => {
        setViewMode((prev) => {
            if (prev === EViewMode.Grid) return EViewMode.List;
            if (prev === EViewMode.List) return "map";
            return EViewMode.Grid;
        });
    };

    const viewModeIcon = (): JSX.Element => {
        if (viewMode === EViewMode.Grid)
            return <LayoutGrid className="h-5 w-5 text-neutral-400" />;
        if (viewMode === EViewMode.List)
            return <ListIcon className="h-5 w-5 text-neutral-400" />;
        return <Globe className="h-5 w-5 text-pink-400" />;
    };

    return (
        <div className="mx-auto flex flex-col items-center px-4 pb-8">
            <header className="flex w-full max-w-2xl flex-col items-center gap-2 pt-8 pb-6 text-center">
                <h1 className="text-5xl font-bold tracking-tight text-white select-none">
                    {$vocabulary.RADIO}
                </h1>
                <p className="text-lg text-balance text-neutral-400">
                    {"Explore stations across the world with Rock It!"}
                </p>
            </header>

            <div className="relative mb-6 w-full max-w-md">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <input
                    type="search"
                    value={query}
                    onChange={(e): void => {
                        const q = e.target.value;
                        setQuery(q);
                        setCountryStations(null);
                        setSelectedCountry(null);
                        if (q === "") {
                            searchDebounce.current?.cancel();
                            setSearchResults(undefined);
                        } else {
                            searchDebounce.current?.(q);
                        }
                    }}
                    placeholder={
                        $vocabulary.RADIO_SEARCH
                    }
                    className="h-11 w-full rounded-full bg-neutral-900 pr-9 pl-10 text-sm font-semibold text-white placeholder-neutral-500 focus:ring-2 focus:ring-[#ee1086]/40 focus:outline-0"
                />
                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-neutral-500 hover:text-white"
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

            <div className="mb-6 w-full rounded-2xl border-2 border-neutral-700">
                <RadioMap
                    onCountryClick={handleCountryClick}
                    selectedCountry={selectedCountry}
                />
            </div>

            {selectedCountry && (
                <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-400">
                        {"Country:"}
                    </span>
                    <span className="rounded-full bg-[#ee1086]/20 px-3 py-1 text-sm font-semibold text-[#ee1086]">
                        {selectedCountry}
                    </span>
                    <button
                        onClick={(): void => {
                            setCountryStations(null);
                            setSelectedCountry(null);
                        }}
                        className="ml-1 cursor-pointer text-neutral-500 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {!loading && !loadingCountry && displayedStations.length > 0 && (
                <div className="mb-4 flex w-full max-w-6xl items-center justify-between">
                    <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                        {selectedCountry
                            ? `${displayedStations.length} stations`
                            : `${displayedStations.length} in your library`}
                    </span>
                    <button
                        className="flex cursor-pointer items-center gap-2 rounded-md p-2 transition hover:bg-neutral-800"
                        onClick={cycleViewMode}
                        aria-label="Toggle view"
                        title={
                            viewMode === EViewMode.Grid
                                ? "List view"
                                : viewMode === EViewMode.List
                                  ? "Map view"
                                  : "Grid view"
                        }
                    >
                        {viewModeIcon()}
                    </button>
                </div>
            )}

            {loading && <LoadingComponent />}

            {loadingCountry && (
                <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-600 border-t-[#ec5588]" />
                    <span className="ml-3 text-sm text-neutral-400">
                        {"Loading stations..."}
                    </span>
                </div>
            )}

            {!loading && !loadingCountry && displayedStations.length > 0 && (
                <div
                    ref={stationsRef}
                    className={
                        viewMode === EViewMode.List
                            ? "flex w-full max-w-6xl flex-col gap-1"
                            : "grid w-full max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                    }
                >
                    {displayedStations.map((station) => {
                        const hasPublicId = "publicId" in station;
                        const key = hasPublicId
                            ? (station as BaseStationResponse).publicId
                            : (station as BaseSearchResultsItem).providerUrl +
                              (station as BaseSearchResultsItem).name;

                        if (viewMode === "map" && hasPublicId) {
                            return (
                                <StationCard
                                    key={key}
                                    station={station as BaseStationResponse}
                                />
                            );
                        }

                        if (viewMode === EViewMode.List) {
                            return (
                                <StationSearchRow
                                    key={key}
                                    station={station as BaseSearchResultsItem}
                                />
                            );
                        }

                        return (
                            <StationSearchCard
                                key={key}
                                station={station as BaseSearchResultsItem}
                            />
                        );
                    })}
                </div>
            )}

            {showEmptyState && (
                <div className="py-16 text-center text-neutral-500">
                    {$vocabulary.NO_STATIONS}
                </div>
            )}

            {isSearching && searching && !searchResults && (
                <div className="flex items-center justify-center py-16 text-neutral-400">
                    <span className="animate-pulse text-lg font-semibold">
                        {$vocabulary.SEARCH}
                    </span>
                </div>
            )}

            {isSearching && !searching && searchResults?.length === 0 && (
                <div className="py-16 text-center text-neutral-500">
                    {$vocabulary.NO_RESULTS}
                </div>
            )}

            {selectedCountry &&
                !loadingCountry &&
                countryStations?.length === 0 && (
                    <div className="py-16 text-center text-neutral-500">
                        {"No stations found for this country"}
                    </div>
                )}
        </div>
    );
}
