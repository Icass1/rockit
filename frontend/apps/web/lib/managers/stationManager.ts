import {
    BaseSearchResultsItem,
    BaseStationResponse,
    BaseStationResponseSchema,
    isSearchResult,
} from "@rockit/shared";
import type { RadioCacheEntry } from "@/models/types/radio";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { createAtom, ReadonlyAtom } from "@/lib/store";

export class StationManager {
    private _currentStationAtom = createAtom<BaseStationResponse | undefined>();
    private _countries = new Map<
        string,
        RadioCacheEntry<BaseStationResponse[]>
    >();
    private _searches = new Map<
        string,
        RadioCacheEntry<BaseSearchResultsItem[]>
    >();
    private _stations = new Map<string, RadioCacheEntry<BaseStationResponse>>();
    private _playRequest = 0;

    private cached<T>(
        cache: Map<string, RadioCacheEntry<T>>,
        key: string,
        load: () => Promise<T>
    ): Promise<T> {
        const hit = cache.get(key);
        if (hit && hit.expiresAt > Date.now()) return hit.value;
        const entry = { expiresAt: Date.now() + 5 * 60_000, value: load() };
        cache.delete(key);
        cache.set(key, entry);
        if (cache.size > 30) cache.delete(cache.keys().next().value!);
        void entry.value.catch(() => {
            if (cache.get(key) === entry) cache.delete(key);
        });
        return entry.value;
    }

    getByCountry(country: string): Promise<BaseStationResponse[]> {
        return this.cached(this._countries, country, async () => {
            const result = await Http.getStationsByCountry(
                encodeURIComponent(
                    country === "United States of America"
                        ? "United States"
                        : country
                )
            );
            if (!result.isOk()) throw new Error(result.message);
            return BaseStationResponseSchema.array().parse(result.result);
        });
    }

    search(query: string): Promise<BaseSearchResultsItem[]> {
        const normalized = query.trim().slice(0, 120);
        return this.cached(
            this._searches,
            normalized.toLowerCase(),
            async () => {
                const result = await Http.searchStations(normalized);
                if (!result.isOk()) throw new Error(result.message);
                return result.result.results;
            }
        );
    }

    resolve(
        station: BaseStationResponse | BaseSearchResultsItem
    ): Promise<BaseStationResponse> {
        if (!isSearchResult(station)) return Promise.resolve(station);
        const publicId = (station.url || station.providerUrl)
            .split("/")
            .filter(Boolean)
            .pop();
        if (!publicId)
            return Promise.reject(
                new Error(rockIt.vocabularyManager.vocabulary.NO_STATIONS)
            );
        return this.getStation(publicId);
    }

    private getStation(publicId: string): Promise<BaseStationResponse> {
        return this.cached(this._stations, publicId, async () => {
            const result = await Http.getStation(publicId);
            if (!result.isOk()) throw new Error(result.message);
            return result.result;
        });
    }

    async setAndPlayStation(station: BaseStationResponse): Promise<void> {
        // Invalidate any earlier search-result resolution before playing a known station.
        ++this._playRequest;
        if (!station.streamUrl) {
            rockIt.notificationManager.notifyError(
                rockIt.vocabularyManager.vocabulary.RADIO_UNAVAILABLE
            );
            return;
        }
        this._currentStationAtom.set(station);
        rockIt.queueManager.setMedia([station], station.publicId);
        rockIt.queueManager.moveToMedia(station.publicId);
        rockIt.mediaPlayerManager.play();
    }

    async playStationByPublicId(publicId: string): Promise<void> {
        const request = ++this._playRequest;
        try {
            const station = await this.getStation(publicId);
            if (request === this._playRequest)
                await this.setAndPlayStation(station);
        } catch (error) {
            if (request === this._playRequest)
                rockIt.notificationManager.notifyError(
                    error instanceof Error ? error.message : String(error)
                );
        }
    }

    clearStation(): void {
        ++this._playRequest;
        this._currentStationAtom.set(undefined);
    }

    get currentStationAtom(): ReadonlyAtom<BaseStationResponse | undefined> {
        return this._currentStationAtom.getReadonlyAtom();
    }
}
