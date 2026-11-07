import { once } from "node:events";
import http from "node:http";
import { WebSocketServer } from "ws";
import * as dto from "../../../packages/shared/src/dto/index";
import vocabulary from "../../../packages/shared/src/i18n/en.json";

/** Deterministic HTTP boundary, not a second implementation of backend business rules. */
export async function createFixtureBackend(port = 0) {
    const calls: Array<{
        method: string;
        path: string;
        body: unknown;
        elapsedMs: number;
    }> = [];
    const faults = new Map<
        string,
        { status?: number; body?: unknown; delayMs?: number }
    >();
    const unhandled: string[] = [];
    let theme = "dark";
    let lang = "en";
    let volume = 1;
    const artist = {
        type: "artist",
        provider: "Fixture",
        publicId: "artist-1",
        url: "/artist/artist-1",
        providerUrl: "",
        name: "Fixture Ensemble",
        imageUrl: "",
        dominantColor: "",
    };
    const album = {
        type: "album",
        provider: "Fixture",
        publicId: "album-1",
        url: "/album/album-1",
        providerUrl: "",
        name: "Fixture Album",
        artists: [artist],
        releaseDate: "2026-01-01",
        imageUrl: "",
        dominantColor: "",
        undownloadedCount: 0,
    };
    const song = {
        type: "song",
        provider: "Fixture",
        publicId: "song-1",
        providerUrl: "",
        name: "Canción de prueba — Snow",
        artists: [artist],
        audioUrl: "",
        downloaded: true,
        imageUrl: "",
        dominantColor: "",
        duration_ms: 4000,
        discNumber: 1,
        trackNumber: 1,
        album,
    };
    const playlist = {
        type: "playlist",
        provider: "Fixture",
        publicId: "playlist-1",
        url: "/playlist/playlist-1",
        providerUrl: "",
        name: "Playlist only",
        description: null,
        contributors: [],
        imageUrl: "",
        owner: artist,
    };
    // This song exists only through playlist membership, never as a direct library item.
    const playlistSong = {
        ...song,
        publicId: "song-2",
        name: "Playlist exclusive",
    };
    let queue: dto.QueueResponseItem[] = [];
    let currentQueueMediaId: number | null = null;
    const session = () => ({
        username: "fixture",
        image: "",
        admin: false,
        queueType: "SORTED",
        repeatMode: "OFF",
        currentTimeMs: null,
        volume,
        theme,
        showListeningHeatmap: true,
        autoAddToLibrary: false,
    });
    const catalog = [song, playlistSong];
    const server = http.createServer(async (request, response) => {
        const started = performance.now();
        const url = new URL(request.url ?? "/", "http://fixture.invalid");
        const path = url.pathname;
        const method = request.method ?? "GET";
        const origin = request.headers.origin;
        if (origin) response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Access-Control-Allow-Headers", "content-type");
        response.setHeader(
            "Access-Control-Allow-Methods",
            "GET,POST,PATCH,DELETE,OPTIONS"
        );
        if (method === "OPTIONS") {
            response.writeHead(204);
            response.end();
            return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        let body: unknown;
        try {
            body = chunks.length
                ? JSON.parse(Buffer.concat(chunks).toString())
                : undefined;
        } catch {
            response.writeHead(400);
            response.end();
            return;
        }
        const call = {
            method,
            path: url.pathname + url.search,
            body,
            elapsedMs: 0,
        };
        calls.push(call);
        response.on("finish", () => {
            call.elapsedMs = performance.now() - started;
        });
        const send = (
            value: unknown,
            schema?: { parse(value: unknown): unknown },
            status = 200
        ) => {
            try {
                const payload = schema ? schema.parse(value) : value;
                response.writeHead(status, {
                    "content-type": "application/json",
                    "cache-control": "no-store",
                });
                response.end(JSON.stringify(payload));
            } catch (error) {
                response.writeHead(500, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        detail: `Fixture contract error: ${String(error)}`,
                    })
                );
            }
        };
        const fault = faults.get(path);
        if (fault?.delayMs)
            await new Promise((resolve) => setTimeout(resolve, fault.delayMs));
        if (fault && (fault.status || fault.body !== undefined))
            return send(
                fault.body ?? { detail: "Injected failure" },
                undefined,
                fault.status ?? 200
            );
        if (path === "/__fixture/health") return send({ ready: true });
        if (path === "/__fixture/calls") return send({ calls, unhandled });
        if (path === "/assets/artwork.svg") {
            response.writeHead(200, { "content-type": "image/svg+xml" });
            response.end(
                '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="rebeccapurple"/><circle cx="48" cy="48" r="24" fill="hotpink"/></svg>'
            );
            return;
        }
        if (path === "/assets/silence.wav") {
            // Authored four-second silent PCM; no external media or downloads.
            const bytes = Buffer.alloc(44 + 8000 * 2 * 4);
            bytes.write("RIFF");
            bytes.writeUInt32LE(bytes.length - 8, 4);
            bytes.write("WAVEfmt ", 8);
            bytes.writeUInt32LE(16, 16);
            bytes.writeUInt16LE(1, 20);
            bytes.writeUInt16LE(1, 22);
            bytes.writeUInt32LE(8000, 24);
            bytes.writeUInt32LE(16000, 28);
            bytes.writeUInt16LE(2, 32);
            bytes.writeUInt16LE(16, 34);
            bytes.write("data", 36);
            bytes.writeUInt32LE(bytes.length - 44, 40);
            response.writeHead(200, {
                "content-type": "audio/wav",
                "content-length": bytes.length,
                "accept-ranges": "bytes",
            });
            response.end(bytes);
            return;
        }
        if (path === "/auth/login") {
            dto.LoginRequestSchema.parse(body);
            response.setHeader(
                "set-cookie",
                "session_id=fixture; HttpOnly; Path=/; SameSite=Lax"
            );
            return send(
                { userId: "user-1", sessionId: "fixture" },
                dto.LoginResponseSchema
            );
        }
        if (path.startsWith("/vocabulary/") && path !== "/vocabulary/languages")
            return send(
                { currentLang: lang, vocabulary },
                dto.VocabularyResponseSchema
            );
        if (path === "/vocabulary/languages")
            return send(
                {
                    languages: [
                        { langCode: "en", language: "English" },
                        { langCode: "es", language: "Español" },
                        { langCode: "fr", language: "Français" },
                    ],
                },
                dto.LanguagesResponseSchema
            );
        if (!request.headers.cookie?.includes("session_id=fixture"))
            return send({ detail: "Login required" }, undefined, 401);
        if (path === "/auth/logout") {
            response.setHeader(
                "set-cookie",
                "session_id=; Max-Age=0; HttpOnly; Path=/; SameSite=Lax"
            );
            return send({}, dto.OkResponseSchema);
        }
        if (path === "/user/session")
            return send(session(), dto.SessionResponseSchema);
        if (path === "/user/theme") {
            theme = dto.UpdateThemeRequestSchema.parse(body).theme;
            return send({}, dto.OkResponseSchema);
        }
        if (path === "/user/volume") {
            volume = dto.UpdateVolumeRequestSchema.parse(body).volume;
            return send({}, dto.OkResponseSchema);
        }
        if (path === "/user/lang") {
            lang = dto.UpdateLangRequestSchema.parse(body).lang;
            return send({}, dto.OkResponseSchema);
        }
        if (path === "/user")
            return send(
                { ...session(), lang, crossfade: 0 },
                dto.UserSettingsResponseSchema
            );
        if (path === "/user/library/medias")
            return send(
                {
                    albums: [{ item: album, addedAt: "2026-01-01T00:00:00Z" }],
                    playlists: [
                        { item: playlist, addedAt: "2026-01-01T00:00:00Z" },
                    ],
                    songs: [],
                    videos: [],
                    stations: [],
                    shared: [],
                },
                dto.LibraryMediasResponseSchema
            );
        if (path === "/user/library/songs/search") {
            const query = (url.searchParams.get("q") ?? "")
                .normalize("NFD")
                .replace(/\p{M}/gu, "")
                .toLowerCase();
            const found = catalog.filter((item) =>
                `${item.name} ${artist.name}`
                    .normalize("NFD")
                    .replace(/\p{M}/gu, "")
                    .toLowerCase()
                    .includes(query)
            );
            const offset = Number(url.searchParams.get("offset") ?? 0),
                limit = Number(url.searchParams.get("limit") ?? 50);
            return send(
                {
                    songs: found.slice(offset, offset + limit),
                    total: found.length,
                    offset,
                    limit,
                    hasMore: offset + limit < found.length,
                },
                dto.LibrarySongSearchResponseSchema
            );
        }
        if (path === "/user/queue")
            return send(
                {
                    queue,
                    currentQueueMediaId,
                    offset: 0,
                    total: queue.length,
                    queueType: "SORTED",
                },
                dto.QueueResponseSchema
            );
        if (path === "/user/liked-media")
            return send({ media: [] }, dto.LikedMediaResponseSchema);
        if (path === "/user/navigation-pins")
            return send({ pins: [] }, dto.NavigationPinsResponseSchema);
        if (path === "/stats/home")
            return send(
                {
                    songsByTimePlayed: [song],
                    randomSongsLastMonth: [playlistSong],
                    nostalgicMix: [],
                    hiddenGems: [],
                    communityTop: [],
                    monthlyTop: [],
                    moodSongs: [],
                    recentlyClickedMedia: [],
                },
                dto.HomeStatsResponseSchema
            );
        if (path === "/recommendation/for-you")
            return send(
                {
                    songs: [song],
                    discover: [],
                    discoverProvider: null,
                    discoverStatus: "disabled",
                },
                dto.SongListResponseSchema
            );
        if (path === "/recommendation/prepare")
            return send({}, dto.OkResponseSchema);
        if (path === "/media/album/album-1")
            return send(
                { ...album, songs: [song, playlistSong], total: 2 },
                dto.BaseAlbumWithSongsResponseSchema
            );
        if (path === "/media/playlist/playlist-1")
            return send(
                {
                    ...playlist,
                    medias: [
                        {
                            item: playlistSong,
                            publicId: "membership-1",
                            addedAt: "2026-01-01T00:00:00Z",
                            enabled: true,
                        },
                    ],
                    total: 1,
                },
                dto.BasePlaylistWithMediasResponseSchema
            );
        if (path.startsWith("/media/song/"))
            return send(
                catalog.find(
                    (item) => item.publicId === path.split("/").at(-1)
                ) ?? song,
                dto.BaseSongWithAlbumResponseSchema
            );
        if (
            path.startsWith("/media/") &&
            catalog.some((item) => path.endsWith(item.publicId))
        )
            return send(
                catalog.find((item) => path.endsWith(item.publicId)),
                dto.MediaResponseSchema
            );
        if (path.startsWith("/lyrics/dynamic/"))
            return send(
                {
                    provider: "Fixture",
                    publicId: "lyrics-1",
                    offset: 0,
                    lines: [{ timestamp_s: 0, text: "Fixture line" }],
                },
                dto.BaseDynamicLyricsResponseSchema
            );
        unhandled.push(`${method} ${url.pathname}${url.search}`);
        return send({ detail: "Unhandled fixture endpoint" }, undefined, 501);
    });
    const sockets = new WebSocketServer({ server, path: "/ws" });
    sockets.on("connection", (socket) =>
        socket.on("message", (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === "current_queue") {
                queue = (message.queue ?? []).map(
                    (media: unknown, index: number) => ({
                        queueMediaId: index,
                        listPublicId: null,
                        media,
                        randomIndex: index,
                        sortedIndex: index,
                    })
                );
                currentQueueMediaId = message.currentQueueMediaId ?? 0;
            }
        })
    );
    server.listen(port, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string")
        throw new Error("No fixture address");
    const url = `http://127.0.0.1:${address.port}`;
    for (const item of [artist, album, song, playlist, playlistSong]) {
        item.imageUrl = `${url}/assets/artwork.svg`;
    }
    song.audioUrl = playlistSong.audioUrl = `${url}/assets/silence.wav`;
    return {
        url,
        calls,
        faults,
        unhandled,
        catalog,
        close: async () => {
            for (const socket of sockets.clients) socket.terminate();
            sockets.close();
            server.closeAllConnections();
            await new Promise<void>((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve()))
            );
        },
    };
}
