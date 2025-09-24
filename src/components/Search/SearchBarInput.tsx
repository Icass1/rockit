import { useEffect, useRef, useState } from "react";
import pkg from "lodash";

import { useStore } from "@nanostores/react";
import { rockitIt } from "@/lib/rockit";
const { debounce } = pkg;

export default function SearchBarInput() {
    const [value, setValue] = useState("");

    const searchDebounce =
        useRef<pkg.DebouncedFunc<(query: string) => void>>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            searchDebounce.current = debounce((query: string) => {
                rockitIt.searchManager.search(query);
            }, 1000);
        }
    }, []);

    const $lang = useStore(rockitIt.languageManager.langDataAtom);
    if (!$lang) return false;

    return (
        <input
            type="search"
            id="search-bar"
            value={value}
            onChange={(e) => {
                setValue(e.target.value);
            }}
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
