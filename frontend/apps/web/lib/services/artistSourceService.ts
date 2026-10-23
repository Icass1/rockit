import type { BaseSearchResultsItem } from "@/dto";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

/** Resolve audio sources on demand, without replacing global search or playback. */
export async function findArtistSources(
    artist: string,
    title: string,
    type: "album" | "song",
    signal: AbortSignal
): Promise<{ items: BaseSearchResultsItem[]; partial: boolean }> {
    const catalog = await Http.searchProvidersAsync();
    if (!catalog.isOk()) throw new Error(catalog.message);
    const queue = catalog.result.providers.filter((source) => !source.onDemand);
    const items: BaseSearchResultsItem[] = [];
    let failures = 0;
    const total = queue.length;
    const worker = async (): Promise<void> => {
        while (!signal.aborted) {
            const provider = queue.shift();
            if (!provider) return;
            try {
                const result = await Http.searchProviderAsync({
                    query: `${artist} ${title}`,
                    providerId: provider.id,
                    limit: 5,
                    mediaType: type,
                });
                if (!result.isOk()) throw new Error(result.message);
                items.push(
                    ...result.result.results.filter(
                        (item) => item.type === type
                    )
                );
            } catch {
                failures++;
            }
        }
    };
    await Promise.all([worker(), worker()]);
    if (total > 0 && failures === total) throw new Error("Sources unavailable");
    const unique = new Map(items.map((item) => [item.providerUrl, item]));
    return { items: [...unique.values()], partial: failures > 0 };
}

export async function downloadArtistSource(
    source: BaseSearchResultsItem
): Promise<void> {
    const result = await Http.startDownloadFromUrl({
        url: source.providerUrl,
        addToLibrary: true,
        addToPlaylist: false,
        playlistPublicId: null,
    });
    if (!result.isOk()) throw new Error(result.message);
    rockIt.notificationManager.notifySuccess(
        rockIt.vocabularyManager.vocabulary.DOWNLOAD_STARTED
    );
}
