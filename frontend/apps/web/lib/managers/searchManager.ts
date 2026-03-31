import {
    SearchResultsResponse,
    SearchResultsResponseSchema,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";
import { baseApiFetch } from "@/lib/utils/apiFetch";

export class SearchManager {
    private _queryAtom = createAtom<string>("");
    private _searchingAtom = createAtom<boolean>(false);
    private _resultsAtom = createAtom<SearchResultsResponse | undefined>();
    private _abortController: AbortController | null = null;

    async search(query: string) {
        this._abortController?.abort();
        this._abortController = new AbortController();

        this._queryAtom.set(query);
        this._searchingAtom.set(true);

        try {
            const res = await baseApiFetch(
                `/media/search?q=${encodeURIComponent(query)}`,
                { signal: this._abortController.signal }
            );

            if (res?.ok) {
                const json = await res.json();
                this._resultsAtom.set(SearchResultsResponseSchema.parse(json));
            }
        } catch (e) {
            if (e instanceof Error && e.name === "AbortError") return;
            rockIt.notificationManager.notifyError("Error searching music.");
        } finally {
            if (!this._abortController?.signal.aborted) {
                this._searchingAtom.set(false);
            }
        }
    }

    clearResults() {
        this._abortController?.abort();
        this._abortController = null;
        this._queryAtom.set("");
        this._resultsAtom.set(undefined);
        this._searchingAtom.set(false);
    }

    get queryAtom() {
        return this._queryAtom.getReadonlyAtom();
    }

    get searchingAtom() {
        return this._searchingAtom.getReadonlyAtom();
    }

    get resultsAtom() {
        return this._resultsAtom.getReadonlyAtom();
    }
}
