import { SearchResultsResponse, SearchResultsResponseSchema } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";
import { baseApiFetch } from "@/lib/utils/apiFetch";

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
        this._abortController?.abort();
        this._abortController = new AbortController();

        this._searchQueryAtom.set(query);
        this._searchingAtom.set(true);

        try {
            const [mediaRes] = await Promise.all([
                baseApiFetch(`/media/search?q=${encodeURIComponent(query)}`, {
                    signal: this._abortController.signal,
                }),
            ]);

            console.log(mediaRes);

            let media: SearchResultsResponse | undefined;
            console.log("1");
            if (mediaRes?.ok) {
                console.log("2");
                const mediaJson = await mediaRes.json();
                media = SearchResultsResponseSchema.parse(mediaJson);
            }

            console.log(media);
            this._searchResultsAtom.set(media);
        } catch (e) {
            rockIt.notificationManager.notifyError("Error searching music.");
            if (e instanceof Error && e.name === "AbortError") return;
        } finally {
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
