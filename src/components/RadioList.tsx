import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

type Station = {
    stationuuid: string;
    name: string;
    country: string;
    tags: string;
};

const RadioStations = () => {
    const [stations, setStations] = useState<Station[]>([]);
    const [filteredStations, setFilteredStations] = useState<Station[]>([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState({ column: "name", ascending: true });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStations("pop"); // Cambia "pop" según el tag que quieras buscar
    }, []);

    const fetchStations = async (tag: string) => {
        try {
            const response = await fetch(`/api/radioStations?tag=${tag}`);
            console.log(response);
            if (!response.ok) {
                throw new Error("Failed to fetch stations");
            }
            const data = await response.json();
            setStations(data);
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

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        const searchTerm = e.target.value.toLowerCase();
        const filtered = stations.filter(
            (station) =>
                station.name.toLowerCase().includes(searchTerm) ||
                station.country.toLowerCase().includes(searchTerm) ||
                station.tags.toLowerCase().includes(searchTerm)
        );
        setFilteredStations(filtered);
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

    return (
        <div className="p-6 text-white min-h-screen">
            <h1 className="text-2xl font-bold mb-4 text-center">
                Radio Stations
            </h1>
            <div className="mb-4 flex justify-between items-center">
                <input
                    type="text"
                    placeholder="Search for stations..."
                    value={search}
                    onChange={handleSearch}
                    className="px-5 py-2 rounded-md w-full max-w-md border border-neutral-700 bg-neutral-800 text-white"
                />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full table-auto bg-neutral-800 rounded-md overflow-hidden">
                    <thead>
                        <tr className="bg-neutral-700">
                            <th
                                className="p-3 cursor-pointer"
                                onClick={() => handleSort("name")}
                            >
                                Name
                                {filter.column === "name" && (
                                    <ArrowUp
                                        className={`w-5 h-5 inline ml-2 transition-transform ${
                                            filter.ascending
                                                ? ""
                                                : "rotate-180"
                                        }`}
                                    />
                                )}
                            </th>
                            <th
                                className="p-3 cursor-pointer"
                                onClick={() => handleSort("country")}
                            >
                                Country
                                {filter.column === "country" && (
                                    <ArrowUp
                                        className={`w-5 h-5 inline ml-2 transition-transform ${
                                            filter.ascending
                                                ? ""
                                                : "rotate-180"
                                        }`}
                                    />
                                )}
                            </th>
                            <th
                                className="p-3 cursor-pointer"
                                onClick={() => handleSort("tags")}
                            >
                                Genre
                                {filter.column === "tags" && (
                                    <ArrowUp
                                        className={`w-5 h-5 inline ml-2 transition-transform ${
                                            filter.ascending
                                                ? ""
                                                : "rotate-180"
                                        }`}
                                    />
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStations.length > 0 ? (
                            filteredStations.map((station) => (
                                <tr
                                    key={station.stationuuid}
                                    className="hover:bg-neutral-700 transition"
                                >
                                    <td className="p-3">{station.name}</td>
                                    <td className="p-3">
                                        {station.country}
                                    </td>
                                    <td className="p-3">{station.tags}</td>
                                </tr>
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
};

export default RadioStations;
