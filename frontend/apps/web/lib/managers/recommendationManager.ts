import {
    Recommendations,
    RecommendationsSchema,
} from "@/models/types/recommendations";
import { Http } from "@/lib/http";
import { listOfflineSongIds } from "@/lib/offline/db";

export class RecommendationManager {
    private static key(account: string, part: string): string {
        return `rockit:recommendations:${encodeURIComponent(account)}:${part}`;
    }

    static username(account: string): string {
        try {
            return localStorage.getItem(this.key(account, "username")) ?? "";
        } catch {
            return "";
        }
    }

    static setUsername(account: string, username: string): void {
        try {
            const key = this.key(account, "username");
            if (username) localStorage.setItem(key, username);
            else localStorage.removeItem(key);
        } catch {
            /* Recommendations work when browser storage is disabled. */
        }
    }

    static async loadAsync(
        account: string,
        username: string,
        currentPublicId: string | undefined,
        signal: AbortSignal,
        onLocal: (data: Recommendations) => void
    ): Promise<{ data: Recommendations; offline: boolean }> {
        const local = await Http.getRecommendationsAsync(
            "",
            currentPublicId,
            signal
        );
        if (signal.aborted) throw new Error("Cancelled");
        if (!local.isOk()) {
            if (local.code !== 0)
                throw new Error("Recommendations unavailable");
            const raw = localStorage.getItem(this.key(account, "songs"));
            const cached: unknown = raw ? JSON.parse(raw) : null;
            const parsed = RecommendationsSchema.parse(cached);
            const offlineIds = new Set(await listOfflineSongIds());
            return {
                data: {
                    ...parsed,
                    songs: parsed.songs.filter((song) =>
                        offlineIds.has(song.publicId)
                    ),
                },
                offline: true,
            };
        }
        onLocal(local.result);
        let data = local.result;
        if (username) {
            const external = await Http.getRecommendationsAsync(
                username,
                currentPublicId,
                signal
            );
            if (external.isOk()) data = external.result;
            else data = { ...data, externalStatus: "unavailable" };
        }
        if (signal.aborted) throw new Error("Cancelled");
        try {
            localStorage.setItem(
                this.key(account, "songs"),
                JSON.stringify(data)
            );
        } catch {
            /* Quota and private-mode failures must not hide local results. */
        }
        return { data, offline: false };
    }
}
