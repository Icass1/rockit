import { useCallback, useRef, useState } from "react";
import {
    API_ENDPOINTS,
    SearchResultsResponseSchema,
    type BaseSearchResultsItem,
} from "@rockit/shared";
import { apiGet } from "@/lib/api";

export interface SearchState {
    results: BaseSearchResultsItem[];
    searching: boolean;
    error: string | null;
    query: string;
}

export function useSearch() {
    const [results, setResults] = useState<BaseSearchResultsItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const search = useCallback(async (text: string) => {
        setQuery(text);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (!text.trim()) {
            setResults([]);
            setError(null);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            setError(null);

            try {
                const parsed = await apiGet(
                    `${API_ENDPOINTS.search}?q=${encodeURIComponent(text)}`,
                    SearchResultsResponseSchema
                );
                setResults(parsed.results);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Search failed");
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    }, []);

    const clearResults = useCallback(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        setResults([]);
        setQuery("");
        setError(null);
    }, []);

    return {
        results,
        searching,
        error,
        query,
        search,
        clearResults,
    };
}
