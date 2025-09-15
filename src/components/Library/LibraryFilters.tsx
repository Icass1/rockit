"use client";

import { useStore } from "@nanostores/react";
import { langData } from "@/stores/lang";
import { ArrowDownAZ, ArrowUpAZ, ClockArrowDown } from "lucide-react";
import ToggleLayoutButton from "./ToggleLayoutButton";

interface LibraryFiltersProps {
  filterMode: "default" | "asc" | "desc";
  setFilterMode: (mode: "default" | "asc" | "desc") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  libraryView: "grid" | "byArtist";
  setLibraryView: React.Dispatch<
    React.SetStateAction<"grid" | "byArtist">
  >;
}

export function LibraryFilters({
  filterMode,
  setFilterMode,
  searchQuery,
  setSearchQuery,
  libraryView,
  setLibraryView,
}: LibraryFiltersProps) {
  const $lang = useStore(langData);
  if (!$lang) return null;

  return (
    <div className="flex w-full items-center gap-4 md:w-fit">
      <ToggleLayoutButton setLibraryView={setLibraryView} libraryView={libraryView} />

      <button
        className="hidden md:flex"
        onClick={() =>
          setFilterMode(
            filterMode === "default" ? "asc" : filterMode === "asc" ? "desc" : "default"
          )
        }
        title="Toggle filter order"
      >
        {filterMode === "default" && <ClockArrowDown className="h-6 w-6 text-white cursor-pointer" />}
        {filterMode === "asc" && <ArrowDownAZ className="h-6 w-6 text-white cursor-pointer" />}
        {filterMode === "desc" && <ArrowUpAZ className="h-6 w-6 text-white cursor-pointer" />}
      </button>

      <input
        className="text-1xl h-8 w-full rounded-full bg-neutral-900 pr-2 pl-10 font-semibold shadow focus:outline-none"
        style={{
          backgroundImage: "url(/search-icon.png)",
          backgroundPosition: "15px center",
          backgroundSize: "14px",
          backgroundRepeat: "no-repeat",
        }}
        type="search"
        placeholder={$lang.search_library}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}
