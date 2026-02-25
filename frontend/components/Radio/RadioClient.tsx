"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ListPlus, Play, SearchX } from "lucide-react";
import pkg from "lodash";
import useWindowSize from "@/hooks/useWindowSize";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Station } from "@/types/station";
import { rockIt } from "@/lib/rockit/rockIt";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { z } from "zod";
const { debounce } = pkg;

const StationResponseSchema = z.array(
    z.object({
        changeuuid: z.string(),
        stationuuid: z.string(),
        serveruuid: z.string(),
        name: z.string(),
        url: z.string(),
        url_resolved: z.string(),
        homepage: z.string(),
        favicon: z.string(),
        tags: z.string(),
        country: z.string(),
        countrycode: z.string(),
        iso_3166_2: z.string(),
        state: z.string(),
        language: z.string(),
        languagecodes: z.string(),
        votes: z.number(),
        lastchangetime: z.string(),
        lastchangetime_iso8601: z.string(),
        codec: z.string(),
        bitrate: z.number(),
        hls: z.number(),
        lastcheckok: z.number(),
        lastchecktime: z.string(),
        lastchecktime_iso8601: z.string(),
        lastcheckoktime: z.string(),
        lastcheckoktime_iso8601: z.string(),
        lastlocalchecktime: z.string(),
        lastlocalchecktime_iso8601: z.string(),
        clicktimestamp: z.string(),
        clicktimestamp_iso8601: z.string(),
        clickcount: z.number(),
        clicktrend: z.number(),
        ssl_error: z.number(),
        geo_lat: z.undefined(),
        geo_long: z.undefined(),
        geo_distance: z.undefined(),
        has_extended_info: z.boolean(),
    })
);

type StationResponse = z.infer<typeof StationResponseSchema>;

function StationCard({ station }: { station: StationResponse[number] }) {
    return (
        <div
            className="flex h-32 cursor-pointer items-center gap-2 rounded-md bg-neutral-800 px-4 py-2 shadow-md transition hover:bg-neutral-700"
            onClick={() => {
                rockIt.stationManager.setAndPlayStation(station);
            }}
        >
            <Image
                src={
                    station.favicon
                        ? "/api/proxy?url=" + station.favicon
                        : rockIt.STATION_PLACEHOLDER_IMAGE_URL
                }
                alt={`${station.name} cover`}
                className="aspect-square h-14 w-14 rounded-md object-cover min-h-14 min-w-14 md:h-24 md:w-24 md:min-h-24 md:min-w-24"
            />
            <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-lg font-semibold text-white">
                    {station.name}
                </h3>
                <p className="mt-1 line-clamp-1 text-sm text-neutral-400">
                    {station.country || "Unknown Country"}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
                    {station.tags
                        .split(",")
                        .map(
                            (tag) =>
                                String(tag).charAt(0).toUpperCase() +
                                String(tag).slice(1)
                        )
                        .join(", ")}
                </p>
            </div>
            <button className="rounded-full bg-neutral-700 p-[10px] text-white hover:bg-neutral-500">
                <ListPlus className="h-6 w-6 fill-current" />
            </button>
            <button
                className="hidden rounded-full bg-pink-500 p-3 text-white hover:bg-pink-600 md:flex"
                onClick={() => rockIt.stationManager.setAndPlayStation(station)}
            >
                <Play className="h-5 w-5 fill-current" />
            </button>
        </div>
    );
}

function EmptyState({ lang }: { lang: { radio_empty1: string; radio_empty2: string } }) {
    return (
        <div className="col-span-full flex h-36 flex-col items-center justify-center md:h-36">
            <SearchX className="mb-4 h-16 w-16" />
            <p className="text-2xl font-semibold text-white">{lang.radio_empty1}</p>
            <p className="mt-2 text-lg text-neutral-400">{lang.radio_empty2}</p>
        </div>
    );
}

export default function RadioClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [filteredStations, setFilteredStations] = useState<Station[]>([]);
    const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
    const [error, setError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const innerWidth = useWindowSize().width;

    const searchDebounce =
        useRef<pkg.DebouncedFunc<(query: string) => void>>(null);

    const search = useCallback((query: string) => {
        fetchStations("byname", query);
    }, []);

    useEffect(() => {
        searchDebounce.current = debounce((query: string) => {
            search(query);
        }, 1000);
    }, [search]);

    useEffect(() => {
        setIsOnline(typeof window !== "undefined" ? window.navigator.onLine : true);
    }, []);

    const { langFile: lang } = useLanguage();

    const fetchStations = async (by: string, searchTerm: string) => {
        try {
            if (!searchTerm.trim()) {
                setFilteredStations([]);
                return;
            }

            const response = await fetch(
                `/api/radio/stations/${by}/${searchTerm}?limit=15&offset=0`
            );
            if (!response.ok) {
                throw new Error("Failed to fetch stations");
            }
            const data = await response.json();
            const parsed = StationResponseSchema.parse(data);
            setFilteredStations(parsed as unknown as Station[]);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        }
    };

    useEffect(() => {
        if (searchDebounce.current) {
            searchDebounce.current(searchQuery);
        }
    }, []);

    if (error) {
        return (
            <div className="p-2 pt-16 pb-16 text-white md:mt-0 md:mb-0 md:pt-24 md:pb-24">
                Error: {error}
            </div>
        );
    }

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const params = new URLSearchParams(searchParams);
        params.set("q", e.target.value);
        const newParams = params.toString();
        router.push(`${pathname}?${newParams}`);

        setSearchQuery(e.target.value);
        if (searchDebounce.current) {
            searchDebounce.current(e.target.value);
        }
    };

    if (!lang) return false;

    if (!isOnline) {
        return <div>You are offline</div>;
    }

    if (!innerWidth) return;

    const isDesktop = innerWidth > 768;

    return (
        <div
            className={`h-full overflow-y-auto p-2 text-white ${
                isDesktop
                    ? "pt-16 pb-16 md:mt-0 md:mb-0 md:pt-24 md:pb-24"
                    : "pt-20"
            }`}
        >
            <h1
                className={`text-center font-bold select-none ${
                    isDesktop ? "my-6 text-3xl" : "mb-4 text-2xl"
                }`}
            >
                {lang.radio_stations} 📻
            </h1>
            <div className={`mb-4 ${isDesktop ? "flex items-center justify-between" : ""}`}>
                <input
                    type="search"
                    placeholder={isDesktop ? lang.radio_search : "Search for stations, tags, countries..."}
                    value={searchQuery}
                    onChange={handleSearch}
                    className={`w-full rounded-full border border-neutral-700 bg-neutral-800 px-4 py-2 text-white ${
                        isDesktop ? "mx-auto my-3 max-w-md px-5" : ""
                    }`}
                />
            </div>
            <div className={`${isDesktop ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-4"}`}>
                {filteredStations.length > 0 ? (
                    filteredStations.map((station) => (
                        <StationCard
                            station={station}
                            key={station.stationuuid}
                        />
                    ))
                ) : (
                    <EmptyState lang={lang} />
                )}
            </div>
            <div className="min-h-10"></div>
        </div>
    );
}
