"use client";

import { useEffect, useState } from "react";
import SearchBarInput from "./SearchBarInput";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const RenderSearchBarResults = dynamic(() => import("./SearchBarResults"), {
    ssr: false,
});

export default function SearchBar() {
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
        const handleDocumentClick = (event: globalThis.MouseEvent) => {
            if (
                !document
                    .querySelector("#search-bar-results")
                    ?.contains(event?.target as Node) &&
                !document
                    .querySelector("#search-bar")
                    ?.contains(event?.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("click", handleDocumentClick);
        return () => {
            document.removeEventListener("click", handleDocumentClick);
        };
    }, [shouldRenderResults]);

    return (
        <div className="relative h-full w-full">
            {shouldRenderResults && (
                <RenderSearchBarResults open={open} setOpen={setOpen} />
            )}
            <SearchBarInput />
        </div>
    );
}
