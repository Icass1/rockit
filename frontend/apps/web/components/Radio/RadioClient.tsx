"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@nanostores/react";
import {
    EEvent,
    isSearchResult,
    type BaseSearchResultsItem,
    type BaseStationResponse,
} from "@rockit/shared";
import { Globe, LayoutGrid, Library, List, Search, X } from "lucide-react";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import RadioStationItem from "@/components/Radio/RadioStationItem";

const RadioMap = dynamic(() => import("@/components/Radio/RadioMap"), {
    ssr: false,
    loading: () => (
        <div className="skeleton h-75 w-full rounded-2xl md:h-100" />
    ),
});

export default function RadioClient(): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [query, setQuery] = useState("");
    const [country, setCountry] = useState<string | null>(null);
    const [savedOnly, setSavedOnly] = useState(false);
    const [list, setList] = useState(false);
    const [results, setResults] = useState<
        (BaseStationResponse | BaseSearchResultsItem)[]
    >([]);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    const request = useRef(0);
    const fetchLibrary = useCallback(() => Http.getUserLibraryMedias(), []);
    const library = useFetch(fetchLibrary);
    const refreshLibrary = useRef(library.update);
    useEffect(() => {
        refreshLibrary.current = library.update;
    });
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const refresh = (): void => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                void refreshLibrary.current();
            }, 150);
        };
        rockIt.eventManager.addEventListener(
            EEvent.MediaAddedToLibrary,
            refresh
        );
        rockIt.eventManager.addEventListener(
            EEvent.MediaRemovedFromLibrary,
            refresh
        );
        return (): void => {
            clearTimeout(timer);
            rockIt.eventManager.removeEventListener(
                EEvent.MediaAddedToLibrary,
                refresh
            );
            rockIt.eventManager.removeEventListener(
                EEvent.MediaRemovedFromLibrary,
                refresh
            );
        };
    }, []);
    const savedStations = (library.data?.stations ?? []).map(
        (entry) => entry.item
    );
    const savedIds = new Set(savedStations.map((station) => station.publicId));
    const searching = query.trim().length >= 2;
    const browsing = !savedOnly && (searching || country !== null);
    useEffect(() => {
        const version = ++request.current;
        let cancelled = false;
        if (savedOnly || (!searching && !country)) return;
        const timer = setTimeout(
            () => {
                setPending(true);
                setError(false);
                const load = searching
                    ? rockIt.stationManager.search(query)
                    : rockIt.stationManager.getByCountry(country!);
                void load
                    .then((stations) => {
                        if (!cancelled && version === request.current)
                            setResults(stations);
                    })
                    .catch(() => {
                        if (!cancelled && version === request.current) {
                            setError(true);
                            setResults([]);
                        }
                    })
                    .finally(() => {
                        if (!cancelled && version === request.current)
                            setPending(false);
                    });
            },
            searching ? 400 : 0
        );
        return (): void => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, country, savedOnly, searching, retry]);
    const clear = (): void => {
        ++request.current;
        setQuery("");
        setCountry(null);
        setResults([]);
        setPending(false);
        setError(false);
    };
    const selectCountry = (name: string): void => {
        if (name === country && !query && !savedOnly) return;
        clear();
        setCountry(name);
        setSavedOnly(false);
        setPending(true);
    };
    const displayed = browsing ? results : savedStations;
    const loading = browsing ? pending : library.loading;
    const failed = browsing ? error : Boolean(library.error);
    return (
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pt-6 pb-10 sm:px-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white">
                        {v.RADIO}
                    </h1>
                    <p className="mt-2 text-sm text-neutral-400">
                        {v.RADIO_DESCRIPTION}
                    </p>
                </div>
                <div className="relative w-full sm:w-80">
                    <Search className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-neutral-500" />
                    <input
                        type="search"
                        maxLength={120}
                        aria-label={v.RADIO_SEARCH}
                        value={query}
                        placeholder={v.RADIO_SEARCH}
                        onChange={(event): void => {
                            ++request.current;
                            setQuery(event.target.value);
                            setCountry(null);
                            setSavedOnly(false);
                            setResults([]);
                            setPending(event.target.value.trim().length >= 2);
                            setError(false);
                        }}
                        className="h-11 w-full rounded-xl border border-white/10 bg-neutral-900 pr-11 pl-10 text-sm text-white focus:border-pink-500 focus:outline-none"
                    />
                    {query && (
                        <button
                            onClick={clear}
                            aria-label={v.RADIO_CLEAR}
                            className="absolute top-0 right-0 flex h-11 w-11 cursor-pointer items-center justify-center text-neutral-400"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </header>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    aria-pressed={!savedOnly}
                    onClick={(): void => {
                        clear();
                        setSavedOnly(false);
                    }}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm ${!savedOnly ? "bg-pink-500/15 text-pink-400" : "text-neutral-400 hover:bg-neutral-900"}`}
                >
                    <Globe className="h-4 w-4" />
                    {v.RADIO_EXPLORE}
                </button>
                <button
                    aria-pressed={savedOnly}
                    onClick={(): void => {
                        clear();
                        setSavedOnly(true);
                    }}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm ${savedOnly ? "bg-pink-500/15 text-pink-400" : "text-neutral-400 hover:bg-neutral-900"}`}
                >
                    <Library className="h-4 w-4" />
                    {v.RADIO_SAVED}
                    <span className="text-xs">{savedStations.length}</span>
                </button>
            </div>
            <RadioMap
                onCountryClick={selectCountry}
                selectedCountry={country}
                savedStations={savedStations}
            />
            <section aria-busy={loading}>
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-white">
                        <span className="truncate">
                            {country || (searching ? v.SEARCH : v.RADIO_SAVED)}
                        </span>
                        <span className="text-xs font-normal text-neutral-500">
                            {!loading && displayed.length}
                        </span>
                        {browsing && (
                            <button
                                onClick={clear}
                                aria-label={v.RADIO_CLEAR}
                                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-neutral-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </h2>
                    <div className="flex rounded-lg bg-neutral-900 p-1">
                        {[false, true].map((value) => (
                            <button
                                key={String(value)}
                                onClick={(): void => setList(value)}
                                aria-pressed={list === value}
                                aria-label={value ? v.RADIO_LIST : v.RADIO_GRID}
                                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-md ${list === value ? "bg-neutral-800 text-white" : "text-neutral-500"}`}
                            >
                                {value ? (
                                    <List className="h-4 w-4" />
                                ) : (
                                    <LayoutGrid className="h-4 w-4" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                {loading ? (
                    <div
                        role="status"
                        className="py-12 text-center text-neutral-400"
                    >
                        {v.RADIO_LOADING}
                    </div>
                ) : failed ? (
                    <div
                        role="alert"
                        className="py-10 text-center text-neutral-400"
                    >
                        <p>{v.RADIO_LOAD_ERROR}</p>
                        <button
                            onClick={(): void => {
                                if (browsing) {
                                    setPending(true);
                                    setRetry((value) => value + 1);
                                } else void library.update();
                            }}
                            className="mt-3 min-h-11 cursor-pointer rounded-lg bg-neutral-800 px-4 text-white"
                        >
                            {v.RETRY}
                        </button>
                    </div>
                ) : displayed.length ? (
                    <div
                        className={
                            list
                                ? "flex flex-col gap-2"
                                : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                        }
                    >
                        {displayed.map((station) => {
                            const id = isSearchResult(station)
                                ? (station.url || station.providerUrl)
                                      .split("/")
                                      .pop()!
                                : station.publicId;
                            return (
                                <RadioStationItem
                                    key={id}
                                    station={station}
                                    list={list}
                                    saved={savedIds.has(id)}
                                    onSaved={(): void => {
                                        void library.update();
                                    }}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <p
                        role="status"
                        className="rounded-xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-neutral-500"
                    >
                        {browsing ? v.NO_RESULTS : v.RADIO_EMPTY}
                    </p>
                )}
            </section>
        </div>
    );
}
