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
        ]))
            expect(result.isOk(), JSON.stringify(result)).toBe(true);
        const result = await Client.searchLibrarySongsAsync("cancion");
        if (!result.isOk()) throw new Error(result.message);
        expect(result.result.songs[0].name).toContain("Canción");
        expect(result.result.songs[0].imageUrl).toMatch(/127\.0\.0\.1/);
        expect(backend.unhandled).toEqual([]);
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
