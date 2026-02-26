import { SearchResultsResponse, SearchResultsResponseSchema } from "@/dto";
import { createAtom } from "@/lib/store";
import apiFetch from "@/lib/utils/apiFetch";

export class SearchManager {
    // #region: Atoms

    private _searchQueryAtom = createAtom<string>("");
    private _searchingAtom = createAtom<boolean>(false);
    private _searchResultsAtom = createAtom<SearchResultsResponse | undefined>();

    // #endregion

    // #region: Methods

    search(query: string) {
        this._searchQueryAtom.set(query);
        this._searchingAtom.set(true);

        apiFetch("/media/search?q=" + encodeURIComponent(query)).then(
            (data) => {
                if (!data?.ok) {
                    console.warn("No response from /search");
                    this._searchingAtom.set(false);
                    return;
                }

                data.json().then((json) => {
                    try {
                        const results = SearchResultsResponseSchema.parse(json);
                        this._searchResultsAtom.set(results);
                    } catch (e) {
                        console.error("Error parsing search results", e, json);
                    } finally {
                        this._searchingAtom.set(false);
                    }
                });
            }
        );
    }

    clearResults() {
        this._searchQueryAtom.set("");
        this._searchResultsAtom.set(undefined);
        this._searchingAtom.set(false);
    }

    // #endregion

    // #region: Getters

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
