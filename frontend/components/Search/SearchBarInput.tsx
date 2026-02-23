"use client";

import { useEffect, useRef, useState } from "react";
import debounce from "lodash/debounce";
import type { DebouncedFunc } from "lodash";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePathname, useRouter } from "next/navigation";
import { rockIt } from "@/lib/rockit/rockIt";

export default function SearchBarInput() {
    const [value, setValue] = useState("");
    const { langFile: lang } = useLanguage();
    const pathname = usePathname();
    const router = useRouter();

    const searchDebounce = useRef<DebouncedFunc<(q: string) => void> | null>(null);

    useEffect(() => {
        searchDebounce.current = debounce((query: string) => {
            rockIt.searchManager.search(query);
        }, 300);

        return () => searchDebounce.current?.cancel();
    }, []);

    if (!lang) return null;

    return (
        <input
            type="search"
            id="search-bar"
            value={value}
            onChange={(e) => {
                const query = e.target.value;
                setValue(query);

                if (query === "") {
                    searchDebounce.current?.cancel();
                    rockIt.searchManager.clearResults();
                } else {
                    searchDebounce.current?.(query);
                }
            }}
            onClick={() => {
                if (pathname !== "/search") router.push("/search");
            }}
            className="relative top-1/2 z-10 mx-auto block h-10 w-full -translate-y-1/2 rounded-full bg-neutral-900 px-10 text-base font-semibold shadow focus:outline-0 md:z-50"
            style={{
                backgroundImage: "url(/search-icon.png)",
                backgroundPosition: "15px center",
                backgroundSize: "14px",
                backgroundRepeat: "no-repeat",
            }}
            placeholder={lang.search_bar}
        />
    );
}
