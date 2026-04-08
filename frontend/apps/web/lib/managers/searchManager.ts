import {
    SearchResultsResponse,
    SearchResultsResponseSchema,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";
import { apiFetch } from "@/lib/utils/apiFetch";

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

        const res = await apiFetch(
            `/media/search?q=${encodeURIComponent(query)}`,
            SearchResultsResponseSchema,
            { signal: this._abortController.signal }
        );
        this._searchingAtom.set(false);

        if (res.isOk()) {
            this._resultsAtom.set(res.result);
        } else {
            rockIt.notificationManager.notifyError("Error searching music.");
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
