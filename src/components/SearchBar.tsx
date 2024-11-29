import { useEffect, useRef, type Dispatch, type RefObject } from "react";
import pkg from "lodash";
import { searchQuery, searchResults } from "@/stores/searchResults";
import { useStore } from "@nanostores/react";
const { debounce } = pkg;

export default function SearchBar({
    searchBarRef,
    setOpen,
}: {
    searchBarRef: RefObject<HTMLInputElement>;
    setOpen: Dispatch<React.SetStateAction<boolean>>;
}) {
    const value = useStore(searchQuery);

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

    return (
        <input
            ref={searchBarRef}
            value={value}
            onChange={(e) => {
                searchQuery.set(e.target.value);
                setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="font-semibold bg-neutral-900 z-50 shadow mx-auto rounded-full block relative text-1xl px-10 w-3/4 max-w-[600px] h-3/4 top-1/2 -translate-y-1/2 focus:outline-0"
            style={{
                backgroundImage: "url(/search-icon.png)",
                backgroundPosition: "15px center",
                backgroundSize: "14px",
                backgroundRepeat: "no-repeat",
            }}
            placeholder="Search a song or artist..."
        />
    );
}
