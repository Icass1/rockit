import { useEffect, useRef, useState } from "react";
import SearchBar from "./SearchBar";
import RenderSearchResults from "./SearchResults";
import { useStore } from "@nanostores/react";
import { searchResults } from "@/stores/searchResults";

export default function Search() {
    const searchBarRef = useRef<HTMLInputElement>(null);
    const divRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    const $searchResults = useStore(searchResults);

    useEffect(() => {
        if (!divRef.current || !searchBarRef.current) {
            return;
        }
        const handleDocumentClick = (event: globalThis.MouseEvent) => {
            if (
                !divRef.current?.contains(event?.target as Node) &&
                !searchBarRef.current?.contains(event?.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("click", handleDocumentClick);
        return () => {
            document.removeEventListener("click", handleDocumentClick);
        };
    }, [divRef, searchBarRef]);

    // useEffect(() => {
    //     if (
    //         $searchResults.albums ||
    //         $searchResults.playlists ||
    //         $searchResults.songs ||
    //         $searchResults.artists
    //     ) {
    //         setOpen(true);
    //     }
    // }, [$searchResults]);

    return (
        <div className="w-full h-full relative">
            <RenderSearchResults open={open} divRef={divRef} />
            <SearchBar searchBarRef={searchBarRef} setOpen={setOpen} />
        </div>
    );
}
