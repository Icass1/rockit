import type {
    BaseSearchResultsItem,
    SearchResultsResponse,
} from "@rockit/shared";
import type { SearchMediaType, SearchProviderState } from "@/models/search";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, type ReadonlyAtom } from "@/lib/store";

export class SearchManager {
    private _inputAtom = createAtom<string>("");
    private _queryAtom = createAtom<string>("");
    private _searchingAtom = createAtom<boolean>(false);
    private _resultsAtom = createAtom<SearchResultsResponse | undefined>();
    private _providersAtom = createAtom<SearchProviderState[]>([]);
    private _errorAtom = createAtom<boolean>(false);
    private _resultKeysByUrl = new Map<string, string>();
    private _sourcesByUrl = new Map<string, BaseSearchResultsItem[]>();
    private _version = 0;
    private _timer: ReturnType<typeof setTimeout> | undefined;
    private _catalog: ReturnType<typeof Http.searchProvidersAsync> | undefined;
    private _cache = new Map<
        string,
        { expires: number; providers: SearchProviderState[] }
    >();

    scheduleSearch(query: string): void {
        this._inputAtom.set(query);
        const version = this.prepare(query);
        if (version === undefined) return;
        this._timer = setTimeout((): void => {
            void this.execute(version);
        }, 300);
    }

    async search(query: string): Promise<void> {
        const version = this.prepare(query);
        if (version !== undefined) await this.execute(version);
    }

    private prepare(query: string): number | undefined {
        const normalized = query.trim().replace(/\s+/g, " ");
        if (normalized === this._queryAtom.get() && this._searchingAtom.get())
            return;
        clearTimeout(this._timer);
        const version = ++this._version;
        this._queryAtom.set(normalized);
        this._errorAtom.set(false);
        this._providersAtom.set([]);
        this._resultsAtom.set(undefined);
        this._searchingAtom.set(normalized.length >= 2);
        if (normalized.length < 2) return;
        const cached = this._cache.get(normalized.toLocaleLowerCase());
        if (cached && cached.expires > Date.now()) {
            this._providersAtom.set(
                cached.providers.map((provider) => ({
                    ...provider,
                    loadingTypes: [],
                }))
            );
            this.publish();
            this._searchingAtom.set(false);
            return;
        }
        return version;
    }

    private async execute(version: number): Promise<void> {
        try {
            this._catalog ??= Http.searchProvidersAsync();
            const catalog = await this._catalog;
            if (!catalog.isOk()) {
                this._catalog = undefined;
                throw new Error("Search providers unavailable");
            }
            if (version !== this._version) return;
            this._providersAtom.set(
                catalog.result.providers.map((provider) => ({
                    ...provider,
                    results: [],
                    hasMoreTypes: [],
                    limits: {},
                    loadingTypes: [],
                    failed: false,
                }))
            );
            // Two workers stop launching obsolete searches as soon as the input changes.
            const queue = catalog.result.providers.filter(
                (provider) => !provider.onDemand
            );
            const worker = async (): Promise<void> => {
                while (version === this._version) {
                    const provider = queue.shift();
                    if (!provider) break;
                    await this.fetchProvider(
                        provider.id,
                        15,
                        undefined,
                        version
                    );
                }
            };
            await Promise.all([worker(), worker()]);
            if (version !== this._version) return;
            this.publish();
            this.remember();
        } catch {
            this._catalog = undefined;
            if (version === this._version) this._errorAtom.set(true);
        } finally {
            if (version === this._version) this._searchingAtom.set(false);
        }
    }

    private async fetchProvider(
        id: string,
        limit: number,
        mediaType: SearchMediaType | undefined,
        version: number
    ): Promise<void> {
        try {
            const response = await Http.searchProviderAsync({
                query: this._queryAtom.get(),
                providerId: id,
                limit,
                mediaType: mediaType ?? null,
            });
            if (version !== this._version) return;
            this._providersAtom.set(
                this._providersAtom.get().map((provider) => {
                    if (provider.id !== id) return provider;
                    if (!response.isOk()) return { ...provider, failed: true };
                    const items = new Map(
                        provider.results.map((item) => [item.providerUrl, item])
                    );
                    for (const item of response.result.results)
                        items.set(item.providerUrl, item);
                    const kinds: SearchMediaType[] = mediaType
                        ? [mediaType]
                        : [
                              "song",
                              "album",
                              "artist",
                              "playlist",
                              "video",
                              "radio",
                          ];
                    const limits = { ...provider.limits };
                    for (const kind of kinds) limits[kind] = limit;
                    return {
                        ...provider,
                        failed: false,
                        results: [...items.values()],
                        limits,
                        hasMoreTypes: mediaType
                            ? [
                                  ...provider.hasMoreTypes.filter(
                                      (kind) => kind !== mediaType
                                  ),
                                  ...response.result.hasMoreTypes,
                              ]
                            : response.result.hasMoreTypes,
                    };
                })
            );
            this.publish();
        } catch {
            if (version === this._version) {
                this._providersAtom.set(
                    this._providersAtom
                        .get()
                        .map((provider) =>
                            provider.id === id
                                ? { ...provider, failed: true }
                                : provider
                        )
                );
            }
        }
    }

    async loadProvider(id: string): Promise<void> {
        const provider = this._providersAtom
            .get()
            .find((entry) => entry.id === id);
        if (!provider?.onDemand || this._searchingAtom.get()) return;
        const version = this._version;
        this._providersAtom.set(
            this._providersAtom
                .get()
                .map((entry) =>
                    entry.id === id
                        ? { ...entry, onDemand: false, loadingTypes: ["video"] }
                        : entry
                )
        );
        try {
            await this.fetchProvider(id, 15, undefined, version);
        } finally {
            if (version === this._version) {
                this._providersAtom.set(
                    this._providersAtom
                        .get()
                        .map((entry) =>
                            entry.id === id
                                ? { ...entry, loadingTypes: [] }
                                : entry
                        )
                );
                this.remember();
            }
        }
    }

    async loadMore(kind: SearchMediaType): Promise<void> {
        if (this._searchingAtom.get()) return;
        const version = this._version;
        const candidates = this._providersAtom
            .get()
            .filter(
                (provider) =>
                    provider.hasMoreTypes.includes(kind) &&
                    !provider.failed &&
                    !provider.loadingTypes.includes(kind)
            );
        await Promise.all(
            candidates.map(async (provider): Promise<void> => {
                this._providersAtom.set(
                    this._providersAtom.get().map((item) =>
                        item.id === provider.id
                            ? {
                                  ...item,
                                  loadingTypes: [...item.loadingTypes, kind],
                              }
                            : item
                    )
                );
                try {
                    await this.fetchProvider(
                        provider.id,
                        Math.min(100, (provider.limits[kind] ?? 15) * 2),
                        kind,
                        version
                    );
                } finally {
                    if (version === this._version)
                        this._providersAtom.set(
                            this._providersAtom.get().map((item) =>
                                item.id === provider.id
                                    ? {
                                          ...item,
                                          loadingTypes:
                                              item.loadingTypes.filter(
                                                  (type) => type !== kind
                                              ),
                                      }
                                    : item
                            )
                        );
                }
            })
        );
        if (version === this._version) this.remember();
    }

    private matchKey(item: BaseSearchResultsItem): string {
        // A playlist title or station name does not establish identity across sources.
        if (
            item.type === "playlist" ||
            item.type === "radio" ||
            (item.type !== "artist" && !item.artists.length)
        ) {
            return item.providerUrl;
        }
        return JSON.stringify([
            item.type,
            item.name.trim().toLowerCase(),
            item.artists.map((artist) => artist.name.trim().toLowerCase()),
        ]);
    }

    async playDownloadedSong(item: BaseSearchResultsItem): Promise<void> {
        if (item.type !== "song" || !item.downloaded || !item.publicId) return;
        try {
            const response = await Http.getSong(item.publicId);
            if (!response.isOk() || !response.result.downloaded) {
                rockIt.notificationManager.notifyError(
                    rockIt.vocabularyManager.vocabulary.ERROR_GETTING_MEDIA
                );
                return;
            }
            const song = response.result;
            rockIt.queueManager.setMedia([song], song.publicId);
            rockIt.queueManager.moveToMedia(song.publicId);
            rockIt.mediaPlayerManager.play();
        } catch (error) {
            console.error("Error playing downloaded search song", error);
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.ERROR_GETTING_MEDIA
            );
        }
    }

    getSources(item: BaseSearchResultsItem): readonly BaseSearchResultsItem[] {
        return this._sourcesByUrl.get(item.providerUrl) ?? [item];
    }

    getResultKey(item: BaseSearchResultsItem): string {
        return (
            this._resultKeysByUrl.get(item.providerUrl) ?? this.matchKey(item)
        );
    }

    private publish(): void {
        const groups = new Map<string, BaseSearchResultsItem[][]>();
        const seenUrls = new Set<string>();
        for (const provider of this._providersAtom.get()) {
            for (const item of provider.results) {
                if (seenUrls.has(item.providerUrl)) continue;
                seenUrls.add(item.providerUrl);
                const key = this.matchKey(item);
                const buckets = groups.get(key) ?? [];
                // Keep different editions from one provider on separate cards.
                const bucket = buckets.find(
                    (sources) =>
                        !sources.some(
                            (source) => source.provider === item.provider
                        )
                );
                if (bucket) bucket.push(item);
                else buckets.push([item]);
                groups.set(key, buckets);
            }
        }
        this._sourcesByUrl.clear();
        this._resultKeysByUrl.clear();
        const results: BaseSearchResultsItem[] = [];
        for (const [key, buckets] of groups) {
            for (const [index, sources] of buckets.entries()) {
                for (const source of sources) {
                    this._sourcesByUrl.set(source.providerUrl, sources);
                    this._resultKeysByUrl.set(
                        source.providerUrl,
                        `${key}:${index}`
                    );
                }
                results.push(
                    sources.find((source) => source.downloaded) ?? sources[0]
                );
            }
        }
        this._resultsAtom.set({ results });
        this._errorAtom.set(
            this._providersAtom.get().some((provider) => provider.failed)
        );
    }

    private remember(): void {
        if (
            this._providersAtom
                .get()
                .some(
                    (provider) =>
                        provider.failed || provider.loadingTypes.length > 0
                )
        )
            return;
        const key = this._queryAtom.get().toLocaleLowerCase();
        this._cache.delete(key);
        this._cache.set(key, {
            expires: Date.now() + 60_000,
            providers: this._providersAtom.get(),
        });
        if (this._cache.size > 20)
            this._cache.delete(this._cache.keys().next().value!);
    }

    clearResults(): void {
        clearTimeout(this._timer);
        ++this._version;
        this._inputAtom.set("");
        this._queryAtom.set("");
        this._resultsAtom.set(undefined);
        this._providersAtom.set([]);
        this._searchingAtom.set(false);
        this._errorAtom.set(false);
        this._cache.clear();
        this._sourcesByUrl.clear();
        this._resultKeysByUrl.clear();
        this._catalog = undefined;
    }

    get inputAtom(): ReadonlyAtom<string> {
        return this._inputAtom.getReadonlyAtom();
    }
    get queryAtom(): ReadonlyAtom<string> {
        return this._queryAtom.getReadonlyAtom();
    }
    get searchingAtom(): ReadonlyAtom<boolean> {
        return this._searchingAtom.getReadonlyAtom();
    }
    get resultsAtom(): ReadonlyAtom<SearchResultsResponse | undefined> {
        return this._resultsAtom.getReadonlyAtom();
    }
    get providersAtom(): ReadonlyAtom<SearchProviderState[]> {
        return this._providersAtom.getReadonlyAtom();
    }
    get errorAtom(): ReadonlyAtom<boolean> {
        return this._errorAtom.getReadonlyAtom();
    }
}
