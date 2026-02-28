"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import type { DebouncedFunc } from "lodash";
import debounce from "lodash/debounce";
import { rockIt } from "@/lib/rockit/rockIt";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SearchBarInput() {
    const [value, setValue] = useState("");
    const { langFile: lang } = useLanguage();
    const pathname = usePathname();
    const router = useRouter();
    const searching = useStore(rockIt.searchManager.searchingAtom);

    const searchDebounce = useRef<DebouncedFunc<(q: string) => void> | null>(
        null
    );

    useEffect(() => {
        searchDebounce.current = debounce((query: string) => {
            rockIt.searchManager.search(query);
        }, 300);

        return () => searchDebounce.current?.cancel();
    }, []);

    if (!lang) return null;

    return (
        <div className="relative top-1/2 mx-auto w-full -translate-y-1/2">
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
                // pr-16: espacio para spinner (16px) + X nativa (16px) + gaps
                className="z-10 block h-10 w-full rounded-full bg-neutral-900 px-10 text-base font-semibold shadow focus:outline-0 md:z-50"
                style={{
                    backgroundImage: "url(/search-icon.png)",
                    backgroundPosition: "15px center",
                    backgroundSize: "14px",
                    backgroundRepeat: "no-repeat",
                }}
                placeholder={lang.search_bar}
            />

            {/* Spinner — antes de la X nativa del input */}
            {searching && (
                <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-[#ec5588]" />
                </div>
            )}
        </div>
    );
}
