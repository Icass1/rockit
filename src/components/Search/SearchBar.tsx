"use client";

import { useEffect, useRef, useState } from "react";
import SearchBarInput from "./SearchBarInput";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const RenderSearchBarResults = dynamic(() => import("./SearchBarResults"), {
    ssr: false,
});

export default function SearchBar() {
    const searchBarRef = useRef<HTMLInputElement>(null);
    const divRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    const [shouldRenderResults, setShouldRenderResults] = useState(false);

    const pathname = usePathname();

    useEffect(() => {
        // Only run this on client
        if (pathname !== "/search") {
            setShouldRenderResults(true);
        }
    }, [pathname]);

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
    }, [divRef, searchBarRef, shouldRenderResults]);

    return (
        <div className="relative h-full w-full">
            {shouldRenderResults && (
                <RenderSearchBarResults open={open} divRef={divRef} />
            )}
            <SearchBarInput searchBarRef={searchBarRef} setOpen={setOpen} />
        </div>
    );
}
