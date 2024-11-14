import { useEffect, useRef, useState } from "react"
import pkg from 'lodash';
import { searchResults } from "@/stores/searchResults";
const { debounce } = pkg;

export default function SearchBar({ }) {

    const [value, setValue] = useState("supertramp")

    const searchDebounce = useRef<pkg.DebouncedFunc<(query: string) => void>>()

    useEffect(() => {
        if (!searchDebounce.current) { return }
        if (value == "") {
            searchResults.setKey("albums", undefined)
            searchResults.setKey("songs", undefined)
        }

        searchDebounce.current(value)
    }, [value])

    useEffect(() => {
        searchDebounce.current = debounce((query: string) => {
            search(query)
        }, 1000);
    }, [])

    const search = (query: string) => {
        if (query == "") {
            return
        }

        fetch(`http://localhost:8000/search?q=${query}`).then(data => data.json()).then(json => {
            searchResults.setKey("albums", json.albums)
            searchResults.setKey("songs", json.songs)
            searchResults.setKey("playlists", json.playlists)
            searchResults.setKey("artists", json.artists)
        })
    }

    return (
        <input
            value={value}
            onChange={(e) => { setValue(e.target.value) }}
            className="font-semibold bg-neutral-900 z-50 shadow mx-auto rounded-full block relative text-1xl px-10 w-4/5 h-3/4 top-1/2 -translate-y-1/2 focus:outline-0"
            style={{
                backgroundImage: "url(/search-icon.png)",
                backgroundPosition: "15px center",
                backgroundSize: "14px",
                backgroundRepeat: "no-repeat",
            }}
            placeholder="Search a song or artist..."
        />
    )

}