import { rockIt } from "@/lib/rockit/rockIt";
import { useStore } from "@nanostores/react";

export function useSearchResults() {
    const results = useStore(rockIt.searchManager.searchResultsAtom);
    const searching = useStore(rockIt.searchManager.searchingAtom);
    const query = useStore(rockIt.searchManager.searchQueryAtom);

    return { results, searching, query };
}
