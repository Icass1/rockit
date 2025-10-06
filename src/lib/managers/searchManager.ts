import { SearchResultsResponse } from "@/responses/searchResponse";
import apiFetch from "@/lib/utils/apiFetch";
import { createAtom } from "@/lib/store";

export class SearchManager {
    // #region: Atoms

    private _searchQueryAtom = createAtom<string>("");
    private _searchingAtom = createAtom<boolean>(false);
    private _searchResultsAtom = createAtom<
        SearchResultsResponse | undefined
    >();

    // #endregion: Atoms

    // #region: Constructor

    constructor() {}

    // #endregion

    // #region: Methods

    search(query: string) {
        // `/api/radio/stations/${by}/${searchTerm}?limit=10&offset=0`

        this._searchQueryAtom.set(query);
        this._searchingAtom.set(true);

        apiFetch("/search?query=" + encodeURIComponent(query)).then((data) => {
            if (!data?.ok) {
                console.warn("No response from /search");
                this._searchingAtom.set(false);
                return;
            }

            data.json().then((json) => {
                try {
                    const results = SearchResultsResponse.parse(json);
                    this._searchResultsAtom.set(results);
                } catch (e) {
                    console.error("Error parsing search results", e, json);
                } finally {
                    this._searchingAtom.set(false);
                }
            });
        });
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

    // #endregion: Getters
}
