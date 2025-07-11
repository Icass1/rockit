import { useEffect, useRef, type Dispatch } from "react";
import pkg from "lodash";
import {
    searchQuery,
    searchResults,
    filteredStations,
} from "@/stores/searchResults";
import { useStore } from "@nanostores/react";
import { langData } from "@/stores/lang";
const { debounce } = pkg;

export default function SearchBarInput({
    setOpen,
}: {
    setOpen: Dispatch<React.SetStateAction<boolean>>;
}) {
    const value = useStore(searchQuery);

    // const [error, setError] = useState<string | null>(null);

    const searchDebounce =
        useRef<pkg.DebouncedFunc<(query: string) => void>>(null);

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
        if (typeof window !== "undefined") {
            searchDebounce.current = debounce((query: string) => {
                search(query);
                fetchStations("byname", query);
            }, 1000);
        }
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
                // setError(err.message);
            } else {
                // setError("An unknown error occurred");
            }
        }
    };

    const search = (query: string) => {
        if (query == "") {
            return;
        }

        fetch(`/api/search?q=${query}`).then((response) => {
            if (response.ok) {
                return response.json().then((json) => {
                    searchResults.setKey("albums", json.albums);
                    searchResults.setKey("songs", json.songs);
                    searchResults.setKey("playlists", json.playlists);
                    searchResults.setKey("artists", json.artists);
                });
            } else {
                searchResults.setKey("albums", "error");
                searchResults.setKey("songs", "error");
                searchResults.setKey("playlists", "error");
                searchResults.setKey("artists", "error");
            }
        });
    };

    const $lang = useStore(langData);
    if (!$lang) return false;

    return (
        <input
            type="search"
            id="search-bar"
            value={value}
            onChange={(e) => {
                searchQuery.set(e.target.value);

                setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="text-1xl relative top-1/2 z-10 mx-auto block h-10 w-full -translate-y-1/2 rounded-full bg-neutral-900 px-10 font-semibold shadow focus:outline-0 md:z-50"
            style={{
                backgroundImage: "url(/search-icon.png)",
                backgroundPosition: "15px center",
                backgroundSize: "14px",
                backgroundRepeat: "no-repeat",
            }}
            placeholder={$lang.search_bar}
            suppressHydrationWarning
        />
    );
}
