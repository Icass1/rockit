import { BaseSearchResultsItem } from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export function useSearchResults(): {
    results:
        | {
              results: BaseSearchResultsItem[];
          }
        | undefined;
    searching: boolean;
    query: string;
} {
    const results = useStore(rockIt.searchManager.resultsAtom);
    const searching = useStore(rockIt.searchManager.searchingAtom);
    const query = useStore(rockIt.searchManager.queryAtom);

    return { results, searching, query };
}
