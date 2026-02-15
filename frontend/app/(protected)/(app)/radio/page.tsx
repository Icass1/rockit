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
const { debounce } = pkg;

function StationCard({ station }: { station: Station }) {
    return (
        <div
            className="flex h-32 cursor-pointer items-center gap-2 rounded-md bg-neutral-800 px-4 py-2 shadow-md transition hover:bg-neutral-700"
            onClick={() => {
                rockIt.stationManager.setAndPlayStation(station);
            }}
        >
            {/* Imagen de la estación */}
            <Image
                src={
                    station.favicon
                        ? "/api/proxy?url=" + station.favicon
                        : rockIt.STATION_PLACEHOLDER_IMAGE_URL
                }
                alt={`${station.name} cover`}
                className="aspect-square min-h-14 min-w-14 rounded-md object-cover md:h-24 md:min-h-24 md:w-24 md:min-w-24"
            />
            {/* Información de la estación */}
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
            {/* Botón de añadir a Library*/}
            <button className="rounded-full bg-neutral-700 p-[10px] text-white hover:bg-neutral-500">
                <ListPlus className="h-6 w-6 fill-current" />
            </button>

            {/* Botón de reproducción */}
            <button
                className="hidden rounded-full bg-pink-500 p-3 text-white hover:bg-pink-600 md:flex"
                onClick={() => rockIt.stationManager.setAndPlayStation(station)}
            >
                <Play className="h-5 w-5 fill-current" />
            </button>
        </div>
    );
}
export default function RadioStations() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [filteredStations, setFilteredStations] = useState<Station[]>([]);
    const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
    const [error, setError] = useState<string | null>(null);
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

    const { langFile: lang } = useLanguage();

    const fetchStations = async (by: string, searchTerm: string) => {
        try {
            if (!searchTerm.trim()) {
                // Si el término de búsqueda está vacío, no hace la solicitud
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
            setFilteredStations(data);
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

    if (!window.navigator.onLine) {
        return <div>You are offline</div>;
    }

    if (!innerWidth) return;

    if (innerWidth > 768) {
        return (
            <div className="h-full overflow-y-auto p-2 pt-16 pb-16 text-white md:mt-0 md:mb-0 md:pt-24 md:pb-24">
                <h1 className="my-6 text-center text-3xl font-bold select-none">
                    {lang.radio_stations} 📻
                </h1>
                <div className="mb-4 flex items-center justify-between">
                    <input
                        type="search"
                        placeholder={lang.radio_search}
                        value={searchQuery}
                        onChange={handleSearch}
                        className="mx-auto my-3 w-full max-w-md rounded-full border border-neutral-700 bg-neutral-800 px-5 py-2 text-white select-none"
                    />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredStations.length > 0 ? (
                        filteredStations.map((station) => (
                            <StationCard
                                station={station}
                                key={station.stationuuid}
                            />
                        ))
                    ) : (
                        <div className="col-span-full flex h-36 flex-col items-center justify-center">
                            <SearchX className="mb-4 h-16 w-16" />
                            <p className="text-2xl font-semibold text-white">
                                {lang.radio_empty1}
                            </p>
                            <p className="mt-2 text-lg text-neutral-400">
                                {lang.radio_empty2}
                            </p>
                        </div>
                    )}
                </div>
                <div className="min-h-10"></div>
            </div>
        );
    } else {
        return (
            <div className="mt-20 p-4 text-white">
                <h1 className="mb-4 text-center text-2xl font-bold">
                    {lang.radio_stations} 📻
                </h1>
                <div className="mb-4">
                    <input
                        type="search"
                        placeholder="Search for stations, tags, countries..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="w-full rounded-full border border-neutral-700 bg-neutral-800 px-4 py-2 text-white"
                    />
                </div>
                <div className="space-y-4">
                    {filteredStations.length > 0 ? (
                        filteredStations.map((station) => (
                            <StationCard
                                station={station}
                                key={station.stationuuid}
                            />
                        ))
                    ) : (
                        <div className="col-span-full mt-10 flex h-fit flex-col items-center justify-center text-center">
                            <SearchX className="mb-4 h-16 w-16" />
                            <p className="text-2xl font-semibold text-white">
                                {lang.radio_empty1}
                            </p>
                            <p className="mt-2 text-lg text-neutral-400">
                                {lang.radio_empty2}
                            </p>
                        </div>
                    )}
                </div>
                <div className="min-h-10"></div>
            </div>
        );
    }
}
