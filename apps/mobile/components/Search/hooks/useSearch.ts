import { useCallback, useEffect, useRef, useState } from "react";
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
    const version = useRef(0);
    useEffect(
        () => () => {
            ++version.current;
            if (debounceRef.current) clearTimeout(debounceRef.current);
        },
        []
    );
    const { vocabulary } = useVocabulary();

    const search = useCallback(
        async (text: string) => {
            const request = ++version.current;
            setQuery(text);
            setResults([]);
            setSearching(!!text.trim());
            setError(null);

            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            if (!text.trim()) {
                setResults([]);
                setSearching(false);
                setError(null);
                return;
            }

            debounceRef.current = setTimeout(async () => {
                setSearching(true);
                setError(null);

                try {
                    const response = await Http.searchAsync({
                        query: text.trim(),
                    });
                    if (request !== version.current) return;
                    if (response.isOk() && response.result) {
                        setResults(response.result.results);
                    } else {
                        setResults([]);
                        setError(
                            vocabulary.ERROR_SEARCHING + ": " + response.message
                        );
                    }
                } catch {
                    if (request === version.current)
                        setError(vocabulary.ERROR_SEARCHING);
                } finally {
                    if (request === version.current) setSearching(false);
                }
            }, 300);
        },
        [vocabulary]
    );

    const clearResults = useCallback(() => {
        ++version.current;
        setSearching(false);
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
