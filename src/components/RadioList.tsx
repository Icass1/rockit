import React, { useState, useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { currentStation, play, type Station } from "@/stores/audio";
import pkg from "lodash";
import useWindowSize from "@/hooks/useWindowSize";
const { debounce } = pkg;

function StationCard({ station, index }: { station: Station; index: number }) {
    const handleClick = () => {
        currentStation.set(station);
        play();
    };

    return (
        <tr
            className={
                " transition " +
                (index % 2 == 0
                    ? " hover:bg-neutral-700/60 "
                    : " bg-neutral-700/20 hover:bg-neutral-700 ")
            }
            onClick={handleClick}
        >
            <td>
                <img
                    src={station.favicon || "/song-placeholder.png"}
                    alt={station.name}
                    className="w-20 h-20"
                ></img>
            </td>
            <td className="p-3">{station.name}</td>
            <td className="p-3">{station.country}</td>
            <td className="p-3">
                {station.tags
                    .split(",")
                    .map(
                        (tag) =>
                            String(tag).charAt(0).toUpperCase() +
                            String(tag).slice(1)
                    )
                    .join(", ")}
            </td>
        </tr>
    );
}

const RadioStations = () => {
    const [filteredStations, setFilteredStations] = useState<Station[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState({ column: "name", ascending: true });
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
                `/api/radio/stations/${by}/${searchTerm}?limit=10&offset=0`
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

    const handleSort = (column: keyof Station) => {
        const isAscending = filter.column === column ? !filter.ascending : true;
        const sorted = [...filteredStations].sort((a, b) => {
            if (a[column] < b[column]) return isAscending ? -1 : 1;
            if (a[column] > b[column]) return isAscending ? 1 : -1;
            return 0;
        });
        setFilteredStations(sorted);
        setFilter({ column, ascending: isAscending });
    };

    if (innerWidth > 768) {
        return (
            <div className="p-6 text-white min-h-screen">
                <h1 className="text-3xl font-bold mb-4 text-center select-none">
                    Radio Stations 📻
                </h1>
                <div className="mb-4 flex justify-between items-center">
                    <input
                        type="text"
                        placeholder="Search for stations..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="px-5 py-2 rounded-full w-full max-w-md border border-neutral-700 bg-neutral-800 text-white ml-auto"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full table-auto bg-neutral-800 rounded-md overflow-hidden">
                        <thead>
                            <tr className="bg-neutral-700 select-none">
                                <th
                                    className="p-3 cursor-pointer w-20"
                                    onClick={() => handleSort("name")}
                                >
                                    Cover
                                </th>
                                <th
                                    className="p-3 cursor-pointer"
                                    onClick={() => handleSort("name")}
                                >
                                    Name
                                    {filter.column === "name" && (
                                        <ArrowUp
                                            className={`w-5 h-5 inline ml-2 transition-transform ${
                                                filter.ascending ? "" : "rotate-180"
                                            }`}
                                        />
                                    )}
                                </th>
                                <th
                                    className="p-3 cursor-pointer w-36"
                                    onClick={() => handleSort("country")}
                                >
                                    Country
                                    {filter.column === "country" && (
                                        <ArrowUp
                                            className={`w-5 h-5 inline ml-2 transition-transform ${
                                                filter.ascending ? "" : "rotate-180"
                                            }`}
                                        />
                                    )}
                                </th>
                                <th
                                    className="p-3 cursor-pointer"
                                    onClick={() => handleSort("tags")}
                                >
                                    Tags
                                    {filter.column === "tags" && (
                                        <ArrowUp
                                            className={`w-5 h-5 inline ml-2 transition-transform ${
                                                filter.ascending ? "" : "rotate-180"
                                            }`}
                                        />
                                    )}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStations.length > 0 ? (
                                filteredStations.map((station, index) => (
                                    <StationCard
                                        index={index}
                                        station={station}
                                        key={station.stationuuid}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="text-center p-4">
                                        No stations found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
                        placeholder="Search for stations..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="px-4 py-2 rounded-full w-full border border-neutral-700 bg-neutral-800 text-white"
                    />
                </div>
                <div className="space-y-4">
                    {filteredStations.length > 0 ? (
                        filteredStations.map((station, index) => (
                            <div
                                key={station.stationuuid}
                                className="flex items-center bg-neutral-800 rounded-md px-4 py-2 h-24"
                            >
                                <img
                                    src={station.favicon || "/logos/logo-sq-2.png"}
                                    alt={`${station.name} cover`}
                                    className="w-14 h-14 rounded-md mr-4"
                                />
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold line-clamp-2">
                                        {station.name}
                                    </h3>
                                    <p className="text-sm text-neutral-400 mt-1 line-clamp-1">
                                        {station.country || "Unknown Country"}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-neutral-400">
                            No stations found.
                        </p>
                    )}
                </div>
                <div className="min-h-10"></div>
            </div>
        );    
    }
};

export default RadioStations;
