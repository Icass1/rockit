import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { ArrowDownAZ, ArrowUpAZ, ClockArrowDown } from "lucide-react";
import { useState } from "react";

export function LibraryFilters() {
    const [filterMode, setFilterMode] = useState<"default" | "asc" | "desc">(
        "default"
    );
    const [searchQuery, setSearchQuery] = useState("");

    console.log(searchQuery);

    const $lang = useStore(langData);
    if (!$lang) return;

    return (
        <div className="flex w-full items-center md:w-fit">
            <button className="mr-0 hidden md:mr-2 md:flex">
                {filterMode === "default" && (
                    <ClockArrowDown
                        id="filterIcon"
                        className="h-6 w-6 text-white"
                        onClick={() => setFilterMode("asc")}
                    />
                )}
                {filterMode === "asc" && (
                    <ArrowDownAZ
                        id="filterIcon"
                        className="h-6 w-6 text-white"
                        onClick={() => setFilterMode("desc")}
                    />
                )}
                {filterMode === "desc" && (
                    <ArrowUpAZ
                        id="filterIcon"
                        className="h-6 w-6 text-white"
                        onClick={() => setFilterMode("default")}
                    />
                )}
            </button>
            <input
                className="text-1xl h-8 w-full rounded-full bg-neutral-900 pr-2 pl-10 font-semibold shadow focus:outline-0"
                style={{
                    backgroundImage: "url(/search-icon.png)",
                    backgroundPosition: "15px center",
                    backgroundSize: "14px",
                    backgroundRepeat: "no-repeat",
                }}
                type="search"
                placeholder={$lang.search_library}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
    );
}
