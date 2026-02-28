import { SearchResultsResponse, SearchResultsResponseSchema } from "@/dto";
import { createAtom } from "@/lib/store";
import apiFetch from "@/lib/utils/apiFetch";

export class SearchManager {
    // #region Atoms

    private _searchQueryAtom = createAtom<string>("");
    private _searchingAtom = createAtom<boolean>(false);
    private _searchResultsAtom = createAtom<
        SearchResultsResponse | undefined
    >();

    // #endregion

    // Cancels the in-flight request when a new search fires
    private _abortController: AbortController | null = null;

    // #region Methods

    async search(query: string) {
        // Cancel any previous in-flight request so stale responses
        // never overwrite a newer query's results
        this._abortController?.abort();
        this._abortController = new AbortController();

        this._searchQueryAtom.set(query);
        this._searchingAtom.set(true);

        // NOTE: _searchResultsAtom is NOT cleared here on purpose.
        // Previous results stay visible while the new request is in flight,
        // preventing the "flash of empty content" between keystrokes.

        try {
            const data = await apiFetch(
                "/media/search?q=" + encodeURIComponent(query),
                { signal: this._abortController.signal }
            );

            if (!data?.ok) return;

            const json = await data.json();
            const results = SearchResultsResponseSchema.parse(json);
            this._searchResultsAtom.set(results);
        } catch (e) {
            // AbortError is expected when a newer search supersedes this one
            if (e instanceof Error && e.name === "AbortError") return;
        } finally {
            // Only stop the loading indicator if this request wasn't aborted
            if (!this._abortController?.signal.aborted) {
                this._searchingAtom.set(false);
            }
        }
    }

    clearResults() {
        this._abortController?.abort();
        this._abortController = null;
        this._searchQueryAtom.set("");
        this._searchResultsAtom.set(undefined);
        this._searchingAtom.set(false);
    }

    // #endregion

    // #region Getters

    get searchQueryAtom() {
        return this._searchQueryAtom;
    }
    get searchResultsAtom() {
        return this._searchResultsAtom;
    }
    get searchingAtom() {
        return this._searchingAtom;
    }

    // #endregion
}
