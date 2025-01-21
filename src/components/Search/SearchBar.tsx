import { useEffect, useRef, useState } from "react";
import SearchBarInput from "./SearchBarInput";
import RenderSearchBarResults from "./SearchBarResults";

export default function SearchBar() {
    const searchBarRef = useRef<HTMLInputElement>(null);
    const divRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

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

    return (
        <div className="w-full h-full relative">
            {window.location.pathname != "/search" && (
                <RenderSearchBarResults open={open} divRef={divRef} />
            )}
            <SearchBarInput searchBarRef={searchBarRef} setOpen={setOpen} />
        </div>
    );
}
