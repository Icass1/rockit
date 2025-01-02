import { useEffect, useState } from "react";
import { ArrowDownAZ, ArrowUpZA, Clock } from "lucide-react";

const LibraryFilters = () => {
    const [filterMode, setFilterMode] = useState<"default" | "asc" | "desc">(
        "default"
    );
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        // Inicializar filtrado y ordenación
        function filterItems() {
            const filter = searchQuery.toLowerCase();
            const items =
                document.querySelectorAll<HTMLElement>(".library-item");
            items.forEach((item) => {
                const text = item.textContent?.toLowerCase() || "";
                item.style.display = text.includes(filter) ? "" : "none";
            });
        }

        function sortItems() {
            const containers = document.querySelectorAll(
                ".relative.flex.items-center.gap-5, .grid.gap-5"
            );
            containers.forEach((container) => {
                const items = Array.from(container.children) as HTMLElement[];
                items.sort((a, b) => {
                    const textA = a.textContent?.toLowerCase() || "";
                    const textB = b.textContent?.toLowerCase() || "";
                    if (filterMode === "asc") return textA.localeCompare(textB);
                    if (filterMode === "desc")
                        return textB.localeCompare(textA);
                    return textA.localeCompare(textB);
                });
                items.forEach((item) => container.appendChild(item));
            });
        }

        filterItems();
        sortItems();
    }, [searchQuery, filterMode]);

    return (
        <div className="flex items-center w-full md:w-fit">
            <button id="filterButton" className="mr-0 md:mr-2 hidden md:flex">
                {filterMode === "default" && (
                    <Clock id="filterIcon" className="w-6 h-6 text-white" />
                )}
                {filterMode === "asc" && (
                    <ArrowUpZA id="filterIcon" className="w-6 h-6 text-white" />
                )}
                {filterMode === "desc" && (
                    <ArrowDownAZ
                        id="filterIcon"
                        className="w-6 h-6 text-white"
                    />
                )}
            </button>
            <input
                id="searchInput"
                className="font-semibold bg-neutral-900 shadow mx-auto rounded-full text-1xl pl-10 pr-2 md:w-1/10 w-full h-8 focus:outline-0"
                style={{
                    backgroundImage: "url(/search-icon.png)",
                    backgroundPosition: "15px center",
                    backgroundSize: "14px",
                    backgroundRepeat: "no-repeat",
                }}
                placeholder="Search in Library"
            />
        </div>
    );
};

export default LibraryFilters;
