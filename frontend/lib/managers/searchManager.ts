import {
    SearchResultsResponse,
    SearchResultsResponseSchema,
    YouTubeSearchResponseSchema,
    type YouTubeSearchResponse,
} from "@/dto";
import { Station } from "@/types/station";
import { createAtom } from "@/lib/store";
import { apiFetch } from "@/lib/utils/apiFetch";

export interface SearchResults {
    media: SearchResultsResponse | undefined;
    radio: Station[];
    youtube: YouTubeSearchResponse | undefined;
}

export class SearchManager {
    // #region Atoms

    private _searchQueryAtom = createAtom<string>("");
    private _searchingAtom = createAtom<boolean>(false);
    private _searchResultsAtom = createAtom<SearchResults | undefined>();

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
            const [mediaRes, radioRes, youtubeRes] = await Promise.all([
                apiFetch(`/media/search?q=${encodeURIComponent(query)}`, {
                    signal: this._abortController.signal,
                }),
                fetch(
                    `/radio/stations/byname/${encodeURIComponent(query)}?limit=5`,
                    { signal: this._abortController.signal }
                ),
                apiFetch(
                    `/youtube/search?q=${encodeURIComponent(query)}&limit=5`,
                    {
                        signal: this._abortController.signal,
                    }
                ),
            ]);

            let media: SearchResultsResponse | undefined;
            if (mediaRes?.ok) {
                const mediaJson = await mediaRes.json();
                media = SearchResultsResponseSchema.parse(mediaJson);
            }

            let radio: Station[] = [];
            if (radioRes.ok) {
                radio = await radioRes.json();
            }

            let youtube: YouTubeSearchResponse | undefined;
            if (youtubeRes?.ok) {
                const youtubeJson = await youtubeRes.json();
                youtube = YouTubeSearchResponseSchema.parse(youtubeJson);
            }

            this._searchResultsAtom.set({ media, radio, youtube });
        } catch (e) {
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
