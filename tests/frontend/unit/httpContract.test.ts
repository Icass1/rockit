import { BaseHttp } from "@rockit/shared";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createFixtureBackend } from "../fixtures/backend";

let backend: Awaited<ReturnType<typeof createFixtureBackend>>;
class Client extends BaseHttp {
    static cookie = "session_id=fixture";
    protected static override baseApiFetchAsync(
        path: string,
        options: RequestInit = {}
    ) {
        return fetch(backend.url + path, {
            ...options,
            headers: { ...options.headers, Cookie: this.cookie },
        });
    }
}
beforeAll(async () => {
    backend = await createFixtureBackend();
});
afterAll(async () => backend.close());
describe("real generated HTTP contracts against the local backend", () => {
    it("loads session, library, playlist-only search, settings and album with local artwork", async () => {
        for (const result of await Promise.all([
            Client.getSession(),
            Client.getUserLibraryMedias(),
            Client.searchLibrarySongsAsync("Playlist exclusive"),
            Client.getUser(),
            Client.getAlbum("album-1"),
            Client.getAllLanguages(),
            Client.getFeaturedLastMonth(),
            Client.getRecommendationsForYou(),
            Client.getBookmarks({ mediaPublicId: "song-1" }),
            Client.getAudioBounds("song-1"),
            Client.getDynamicLyricsAsync("song-1"),
            Client.getLyricsCorrectionContextAsync("song-1"),
            Client.getDownloads(),
            Client.getFriends(),
            Client.getBlockedUsers(),
            Client.getFriendRequests(),
            Client.getFriendsActivity(),
            Client.searchUsers("fixture"),
            Client.getShareInbox(),
            Client.getShareSent(),
            Client.getActiveSessions(),
            Client.getLeaderboard(),
            Client.listNotifications(),
            Client.getUserPlaylistsAsync(),
            Client.getCollectionItems("album-1"),
            Client.getCollectionItems("playlist-1"),
            Client.getArtistCatalogPage("artist-1"),
            Client.getArtistPageByName("Fixture Ensemble"),
            Client.getMediaAsync("song-1"),
            Client.getRelatedSongs("song-1"),
            Client.getUserStats({
                range: "7d",
                start: null,
                end: null,
                timezoneOffsetMinutes: 0,
            }),
            Client.getUserStatsV2({
                range: "7d",
                start: null,
                end: null,
                timezoneOffsetMinutes: 0,
            }),
        ]))
            expect(result.isOk(), JSON.stringify(result)).toBe(true);
        const result = await Client.searchLibrarySongsAsync("cancion");
        if (!result.isOk()) throw new Error(result.message);
        expect(result.result.songs.map((song) => song.name)).toEqual([
            "Canción de prueba — Snow",
        ]);
        const exclusive =
            await Client.searchLibrarySongsAsync("Playlist exclusive");
        if (!exclusive.isOk()) throw new Error(exclusive.message);
        expect(exclusive.result.songs.map((song) => song.publicId)).toEqual([
            "song-2",
        ]);
        expect(backend.unhandled).toEqual([]);
        expect(result.result.songs[0].imageUrl).toMatch(/127\.0\.0\.1/);
        expect(backend.unhandled).toEqual([]);
    });
    it("reads actual workbook translations through the generated vocabulary contract", async () => {
        const result = await Client.getVocabularyByCode("es");
        if (!result.isOk()) throw new Error(result.message);
        expect(result.result.currentLang).toBe("es");
        expect(result.result.vocabulary.PLAYER_AUDIO_ONLY).toBe("Solo audio");
        expect(result.result.vocabulary.LIBRARY_PLAY_ALL_ALBUMS).toContain(
            "álbumes"
        );
    });
    it("preserves authentication failures, server failures and invalid-success contracts", async () => {
        Client.cookie = "";
        expect((await Client.getSession()).code).toBe(401);
        Client.cookie = "session_id=fixture";
        backend.faults.set("/user/session", { status: 503 });
        expect((await Client.getSession()).code).toBe(503);
        backend.faults.set("/user/session", { body: { username: 42 } });
        const log = vi.spyOn(console, "error").mockImplementation(() => {});
        expect((await Client.getSession()).isOk()).toBe(false);
        expect(log).toHaveBeenCalled();
        backend.faults.clear();
    });
    it("rejects unimplemented routes instead of returning a misleading generic success", async () => {
        const response = await fetch(backend.url + "/missing", {
            headers: { Cookie: Client.cookie },
        });
        expect(response.status).toBe(501);
        expect(backend.unhandled).toEqual(["GET /missing"]);
    });
});
