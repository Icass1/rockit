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
        <div className="flex items-center w-full md:w-fit">
            <button className="mr-0 md:mr-2 hidden md:flex">
                {filterMode === "default" && (
                    <ClockArrowDown
                        id="filterIcon"
                        className="w-6 h-6 text-white"
                        onClick={() => setFilterMode("asc")}
                    />
                )}
                {filterMode === "asc" && (
                    <ArrowDownAZ
                        id="filterIcon"
                        className="w-6 h-6 text-white"
                        onClick={() => setFilterMode("desc")}
                    />
                )}
                {filterMode === "desc" && (
                    <ArrowUpAZ
                        id="filterIcon"
                        className="w-6 h-6 text-white"
                        onClick={() => setFilterMode("default")}
                    />
                )}
            </button>
            <input
                className="font-semibold bg-neutral-900 shadow w-full rounded-full text-1xl pl-10 pr-2 h-8 focus:outline-0"
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
