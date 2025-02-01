import { useEffect, useRef, type Dispatch, type RefObject } from "react";
import pkg from "lodash";
import {
    searchQuery,
    searchResults,
    filteredStations,
} from "@/stores/searchResults";
import { useStore } from "@nanostores/react";
import { langData } from "@/stores/lang";
import { useState } from "react";
const { debounce } = pkg;

export default function SearchBarInput({
    searchBarRef,
    setOpen,
}: {
    searchBarRef: RefObject<HTMLInputElement>;
    setOpen: Dispatch<React.SetStateAction<boolean>>;
}) {
    const value = useStore(searchQuery);

    const [error, setError] = useState<string | null>(null);

    const searchDebounce = useRef<pkg.DebouncedFunc<(query: string) => void>>();

    useEffect(() => {
        if (!searchDebounce.current) {
            return;
        }
        if (value == "") {
            searchResults.setKey("albums", undefined);
            searchResults.setKey("songs", undefined);
            searchResults.setKey("playlists", undefined);
            searchResults.setKey("artists", undefined);
        }

        searchDebounce.current(value);
    }, [value]);

    useEffect(() => {
        searchDebounce.current = debounce((query: string) => {
            search(query);
        }, 1000);
    }, []);

    const fetchStations = async (by: string, searchTerm: string) => {
        try {
            if (!searchTerm.trim()) {
                // Si el término de búsqueda está vacío, no hace la solicitud
                return;
            }

            const response = await fetch(
                `/api/radio/stations/${by}/${searchTerm}?limit=10&offset=0`
            );
            if (!response.ok) {
                throw new Error("Failed to fetch stations");
            }
            const data = await response.json();
            filteredStations.set(data);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        }
    };

    const search = (query: string) => {
        if (query == "") {
            return;
        }

        fetch(`/api/search?q=${query}`)
            .then((data) => data.json())
            .then((json) => {
                searchResults.setKey("albums", json.albums);
                searchResults.setKey("songs", json.songs);
                searchResults.setKey("playlists", json.playlists);
                searchResults.setKey("artists", json.artists);
            });
    };

    const $lang = useStore(langData);
    if (!$lang) return;

    return (
        <input
            ref={searchBarRef}
            value={value}
            onChange={(e) => {
                searchQuery.set(e.target.value);
                fetchStations("byname", e.target.value);
                setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="font-semibold bg-neutral-900 z-10 md:z-50 shadow mx-auto rounded-full block relative text-1xl px-10 w-3/4 max-w-[600px] h-3/4 top-1/2 -translate-y-1/2 focus:outline-0"
            style={{
                backgroundImage: "url(/search-icon.png)",
                backgroundPosition: "15px center",
                backgroundSize: "14px",
                backgroundRepeat: "no-repeat",
            }}
            placeholder={$lang.search_bar}
        />
    );
}
