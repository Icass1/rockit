import { getRockIt } from "@/rockit/rockitRef";
import type { CollectionPageState } from "@/models/interfaces/collectionPageState";
import { createAtom } from "@/lib/store";

/** One bounded page per list, with stale responses discarded after navigation or search. */
export class CollectionPager {
    readonly state;
    private generation = 0;
    private searchTimer?: ReturnType<typeof setTimeout>;

    constructor(
        readonly publicId: string,
        initial?: Partial<CollectionPageState>
    ) {
        this.state = createAtom<CollectionPageState>({
            media: [],
            expandedByMediaId: {},
            query: "",
            offset: 0,
            limit: 100,
            total: 0,
            hasMore: false,
            loading: false,
            ...initial,
        });
    }

    dispose(): void {
        this.generation++;
        clearTimeout(this.searchTimer);
    }

    search(query: string): void {
        this.generation++;
        clearTimeout(this.searchTimer);
        this.state.set({ ...this.state.get(), query, loading: true });
        this.searchTimer = setTimeout(() => {
            void this.load(0, query);
        }, 250);
    }

    async load(offset = 0, query = this.state.get().query): Promise<void> {
        const generation = ++this.generation;
        const previous = this.state.get();
        this.state.set({ ...previous, loading: true, query, error: undefined });
        const response = await getRockIt().http.getCollectionItems(
            this.publicId,
            offset,
            previous.limit,
            query
        );
        if (generation !== this.generation) return;
        if (response.isNotOk()) {
            this.state.set({
                ...previous,
                query,
                loading: false,
                error: response.message,
            });
            return;
        }
        if (!response.isOk()) return;
        const page = response.result;
        const expandedByMediaId: Record<string, boolean> = {};
        for (const entry of page.items)
            expandedByMediaId[entry.item.publicId] = entry.expanded;
        this.state.set({
            collection: page.collection,
            media: page.items.map((entry) => entry.item),
            expandedByMediaId,
            query,
            offset: page.offset,
            limit: page.limit,
            total: page.total,
            hasMore: page.hasMore,
            loading: false,
        });
    }

    async next(): Promise<void> {
        const state = this.state.get();
        if (!state.loading && state.hasMore)
            await this.load(state.offset + state.limit);
    }
    async previous(): Promise<void> {
        const state = this.state.get();
        if (!state.loading && state.offset > 0)
            await this.load(Math.max(0, state.offset - state.limit));
    }
}
