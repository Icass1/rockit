import { BaseSearchResultsItem, SearchResultsResponse } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, ReadonlyAtom } from "@/lib/store";

export class SearchManager {
    private _queryAtom = createAtom<string>("");
    private _searchingAtom = createAtom<boolean>(false);
    private _resultsAtom = createAtom<SearchResultsResponse | undefined>();

    async search(query: string): Promise<void> {
        this._queryAtom.set(query);
        this._searchingAtom.set(true);

        const res = await Http.search({ query });

        this._searchingAtom.set(false);

        if (res.isOk()) {
            this._resultsAtom.set(res.result);
        } else {
            rockIt.notificationManager.notifyError("Error searching music.");
        }
    }

    clearResults(): void {
        this._queryAtom.set("");
        this._resultsAtom.set(undefined);
        this._searchingAtom.set(false);
    }

    get queryAtom(): ReadonlyAtom<string> {
        return this._queryAtom.getReadonlyAtom();
    }

    get searchingAtom(): ReadonlyAtom<boolean> {
        return this._searchingAtom.getReadonlyAtom();
    }

    get resultsAtom(): ReadonlyAtom<
        | {
              results: BaseSearchResultsItem[];
          }
        | undefined
    > {
        return this._resultsAtom.getReadonlyAtom();
    }
}
