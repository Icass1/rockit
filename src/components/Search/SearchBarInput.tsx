import { useEffect, useRef, useState } from "react";
import pkg from "lodash";

import { rockIt } from "@/lib/rockit/rockIt";
import { useLanguage } from "@/contexts/LanguageContext";
const { debounce } = pkg;

export default function SearchBarInput() {
    const [value, setValue] = useState("");
    const lang = useLanguage();

    const searchDebounce =
        useRef<pkg.DebouncedFunc<(query: string) => void>>(null);

    useEffect(() => {
        searchDebounce.current = debounce((query: string) => {
            rockIt.searchManager.search(query);
        }, 1000);
    }, []);

    if (!lang) return false;

    return (
        <input
            type="search"
            id="search-bar"
            value={value}
            onChange={(e) => {
                setValue(e.target.value);
                if (searchDebounce.current)
                    searchDebounce.current(e.target.value);
            }}
            className="text-1xl relative top-1/2 z-10 mx-auto block h-10 w-full -translate-y-1/2 rounded-full bg-neutral-900 px-10 font-semibold shadow focus:outline-0 md:z-50"
            style={{
                backgroundImage: "url(/search-icon.png)",
                backgroundPosition: "15px center",
                backgroundSize: "14px",
                backgroundRepeat: "no-repeat",
            }}
            placeholder={lang.search_bar}
            suppressHydrationWarning
        />
    );
}
