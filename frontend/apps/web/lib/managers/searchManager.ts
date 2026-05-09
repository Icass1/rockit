import {
    Http,
    SearchResultsResponse,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom } from "@/lib/store";

export class SearchManager {
    private _queryAtom = createAtom<string>("");
    private _searchingAtom = createAtom<boolean>(false);
    private _resultsAtom = createAtom<SearchResultsResponse | undefined>();

    async search(query: string) {
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

    clearResults() {
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
