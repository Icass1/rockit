import { useCallback, useRef, useState } from "react";
import { type BaseSearchResultsItem } from "@rockit/shared";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/lib/vocabulary";

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
    const { vocabulary } = useVocabulary();

    const search = useCallback(
        async (text: string) => {
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

                const response = await Http.searchAsync({ query: text });
                if (response.isOk() && response.result) {
                    setResults(response.result.results);
                } else {
                    setResults([]);
                    setError(
                        vocabulary.ERROR_SEARCHING + ": " + response.message
                    );
                }
                setSearching(false);
            }, 300);
        },
        [vocabulary]
    );

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
