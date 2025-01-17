import React, { useState, useEffect, useRef } from "react";
import { ListPlus, Play, SearchX } from "lucide-react";
import { currentStation, play, type Station } from "@/stores/audio";
import pkg from "lodash";
import useWindowSize from "@/hooks/useWindowSize";
const { debounce } = pkg;

function StationCard({ station }: { station: Station }) {
    const handleClick = () => {
        currentStation.set(station);
        play();
    };

    return (
        <div
            className="flex items-center bg-neutral-800 rounded-md px-4 py-2 h-32 shadow-md hover:bg-neutral-700 transition cursor-pointer"
            onClick={handleClick}
        >
            {/* Imagen de la estación */}
            <img
                src={station.favicon || "/logos/logo-sq-2.png"}
                alt={`${station.name} cover`}
                className="w-14 md:w-24 h-14 md:h-24 rounded-md mr-4 object-cover"
            />
            {/* Información de la estación */}
            <div className="flex-1">
                <h3 className="text-lg font-semibold text-white line-clamp-2">
                    {station.name}
                </h3>
                <p className="text-sm text-neutral-400 mt-1 line-clamp-1">
                    {station.country || "Unknown Country"}
                </p>
                <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
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
            <button className="p-[10px] bg-neutral-700 hover:bg-neutral-500 rounded-full text-white ml-1 md:ml-4">
                <ListPlus className="h-6 w-6 fill-current" />
            </button>

            {/* Botón de reproducción */}
            <button
                className="hidden md:flex p-3 bg-pink-500 hover:bg-pink-600 rounded-full text-white ml-4"
                onClick={handleClick}
            >
                <Play className="h-5 w-5 fill-current" />
            </button>
        </div>
    );
}

const RadioStations = () => {
    const [filteredStations, setFilteredStations] = useState<Station[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [innerWidth] = useWindowSize();

    const searchDebounce = useRef<pkg.DebouncedFunc<(query: string) => void>>();

    useEffect(() => {
        searchDebounce.current = debounce((query: string) => {
            search(query);
        }, 1000);
    }, []);

    // useEffect(() => {
    //     // Cambia "pop" según el tag que quieras buscar
    //     fetchStations("byname", "Rock FM España");
    // }, []);

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

    if (error) {
        return <div>Error: {error}</div>;
    }

    const search = (query: string) => {
        fetchStations("byname", query);
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        if (searchDebounce.current) {
            searchDebounce.current(e.target.value);
        }
    };

    if (!window.navigator.onLine) {
        return <div>You are offline</div>;
    }

    if (innerWidth > 768) {
        return (
            <div className="px-6 text-white">
                <h1 className="text-3xl font-bold my-6 text-center select-none">
                    Radio Stations 📻
                </h1>
                <div className="mb-4 flex justify-between items-center">
                    <input
                        type="text"
                        placeholder="Search for stations, tags, countries..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="px-5 py-2 my-3 rounded-full w-full max-w-md border border-neutral-700 bg-neutral-800 text-white mx-auto select-none"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStations.length > 0 ? (
                        filteredStations.map((station, index) => (
                            <StationCard
                                station={station}
                                key={station.stationuuid}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center col-span-full h-36">
                            <SearchX className="w-16 h-16 mb-4" />
                            <p className="text-white text-2xl font-semibold">
                                No se han encontrado estaciones
                            </p>
                            <p className="text-neutral-400 text-lg mt-2">
                                Desde samba brasileña hasta rock australiano,
                                busca y sintoniza tu próximo ritmo favorito!
                            </p>
                        </div>
                    )}
                </div>
                <div className="min-h-10"></div>
            </div>
        );
    } else {
        return (
            <div className="p-4 text-white mt-20">
                <h1 className="text-2xl font-bold mb-4 text-center">
                    Radio Stations 📻
                </h1>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search for stations, tags, countries..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="px-4 py-2 rounded-full w-full border border-neutral-700 bg-neutral-800 text-white"
                    />
                </div>
                <div className="space-y-4">
                    {filteredStations.length > 0 ? (
                        filteredStations.map((station, index) => (
                            <StationCard
                                station={station}
                                key={station.stationuuid}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center col-span-full h-36">
                            <SearchX className="w-16 h-16 mb-4" />
                            <p className="text-white text-2xl font-semibold">
                                No se han encontrado estaciones
                            </p>
                            <p className="text-neutral-400 text-lg mt-2">
                                Desde samba brasileña hasta rock australiano,
                                busca y sintoniza tu próximo ritmo favorito!
                            </p>
                        </div>
                    )}
                </div>
                <div className="min-h-10"></div>
            </div>
        );
    }
};

export default RadioStations;
