export type FilterMode = "default" | "asc" | "desc";

export function filterBySearch<T extends { name?: string }>(
    items: T[],
    query: string
): T[] {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter((item) => item.name?.toLowerCase().includes(lower));
}

export function sortItems<T extends { name?: string }>(
    items: T[],
    mode: FilterMode
): T[] {
    if (mode === "default") return items;
    return [...items].sort((a, b) => {
        const nameA = a.name?.toLowerCase() ?? "";
        const nameB = b.name?.toLowerCase() ?? "";
        return mode === "asc"
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
    });
}
