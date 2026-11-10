import { execFileSync } from "node:child_process";
import { once } from "node:events";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import * as dto from "../../../packages/shared/src/dto/index";
import vocabulary from "../../../packages/shared/src/i18n/en.json";

const translations = JSON.parse(
    execFileSync(
        "python3",
        [
            fileURLToPath(
                new URL(
                    "../../../scripts/export-vocabulary-fixture.py",
                    import.meta.url
                )
            ),
            "--workbook",
            fileURLToPath(new URL("../../../Vocabulary.xlsx", import.meta.url)),
        ],
        { encoding: "utf8" }
    )
) as Record<string, Record<string, string>>;

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
    const protocolErrors: string[] = [];
    const messages: unknown[] = [];
    let pins: dto.NavigationPinResponse[] = [];
    let sentShares: dto.SharedMediaItem[] = [];
    let theme = "dark";
    let lang = "en";
    let volume = 1;
    const artist: dto.BaseArtistResponse = {
        type: "artist",
        provider: "Fixture",
        publicId: "artist-1",
        url: "/artist/artist-1",
        providerUrl: "",
        name: "Fixture Ensemble",
        imageUrl: "",
        dominantColor: "",
    };
    const album: dto.BaseAlbumWithoutSongsResponse = {
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
    const song: dto.BaseSongWithAlbumResponse = {
        type: "song",
        provider: "Fixture",
        publicId: "song-1",
        explicit: true,
        explicitSource: "manual:review",
        providerUrl: "",
        name: "Canción de prueba — Snow",
        artists: [artist],
        audioUrl: "",
        downloaded: true,
        imageUrl: "",
        dominantColor: "",
        duration_ms: 30000,
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
        explicit: null,
        explicitSource: null,
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
    const catalog = [
        song,
        playlistSong,
        ...Array.from({ length: 123 }, (_, index) => ({
            ...song,
            publicId: `synthetic-${index}`,
            name: `Fixture track ${String(index + 1).padStart(3, "0")}`,
        })),
    ];
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
        if (path === "/__fixture/reset") {
            calls.length = 0;
            unhandled.length = 0;
            faults.clear();
            pins = [];
            sentShares = [];
            messages.length = 0;
            protocolErrors.length = 0;
            queue = [];
            currentQueueMediaId = null;
            theme = "dark";
            lang = "en";
            volume = 1;
            return send({ ready: true });
        }
        if (path === "/__fixture/health") return send({ ready: true });
        if (path === "/__fixture/calls")
            return send({ calls, unhandled, messages, protocolErrors });
        if (path === "/__fixture/fault" && method === "POST") {
            const value = body as {
                path: string;
                status?: number;
                body?: unknown;
                delayMs?: number;
            };
            if (typeof value?.path !== "string")
                return send({ detail: "Invalid fault path" }, undefined, 400);
            faults.set(value.path, {
                status: value.status,
                body: value.body,
                delayMs: value.delayMs,
            });
            return send({ ready: true });
        }
        if (path === "/assets/artwork.svg") {
            response.writeHead(200, { "content-type": "image/svg+xml" });
            response.end(
                '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="rebeccapurple"/><circle cx="48" cy="48" r="24" fill="hotpink"/></svg>'
            );
            return;
        }
        if (path === "/assets/silence.wav") {
            // Authored thirty-second silent PCM; no external media or downloads.
            const bytes = Buffer.alloc(44 + 8000 * 2 * 30);
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
            const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
            const start = range ? Number(range[1]) : 0;
            const end =
                range && range[2]
                    ? Math.min(Number(range[2]), bytes.length - 1)
                    : bytes.length - 1;
            if (start > end || start >= bytes.length) {
                response.writeHead(416, {
                    "content-range": `bytes */${bytes.length}`,
                });
                response.end();
                return;
            }
            response.writeHead(range ? 206 : 200, {
                "content-type": "audio/wav",
                "content-length": end - start + 1,
                "accept-ranges": "bytes",
                ...(range
                    ? {
                          "content-range": `bytes ${start}-${end}/${bytes.length}`,
                      }
                    : {}),
            });
            response.end(bytes.subarray(start, end + 1));
            return;
        }
        try {
            if (path === "/auth/login") {
                const payload = dto.LoginRequestSchema.parse(body);
                response.setHeader(
                    "set-cookie",
                    "session_id=fixture; HttpOnly; Path=/; SameSite=Lax"
                );
                return send(
                    {
                        userId: "user-1",
                        sessionId:
                            payload.platform === "MOBILE" ? "fixture" : null,
                    },
                    dto.LoginResponseSchema
                );
            }
            if (
                path.startsWith("/vocabulary/") &&
                path !== "/vocabulary/languages"
            )
                return send(
                    {
                        currentLang: path.endsWith("/user")
                            ? lang
                            : Object.hasOwn(
                                    translations,
                                    path.split("/").at(-1)!
                                )
                              ? path.split("/").at(-1)!
                              : "en",
                        vocabulary: {
                            ...vocabulary,
                            ...translations[
                                path.endsWith("/user")
                                    ? lang
                                    : path.split("/").at(-1)!
                            ],
                        },
                    },
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
            const membership = (item: typeof song) => ({
                item,
                addedAt: "2026-01-01T00:00:00Z",
                expanded: false,
            });
            const fullPlaylist = {
                ...playlist,
                medias: [membership(playlistSong)],
                total: 1,
            };
            if (path === "/default/playlist")
                return send(
                    { playlists: [fullPlaylist] },
                    dto.UserPlaylistsResponseSchema
                );
            if (path === "/friends")
                return send(
                    {
                        friends: [
                            {
                                publicId: "friend-1",
                                username: "Fixture Friend",
                                imageUrl: null,
                                status: "accepted",
                                isOnline: false,
                                nowPlaying: null,
                                level: 1,
                                levelTitle: null,
                                dateAdded: "2026-01-01T00:00:00Z",
                            },
                        ],
                    },
                    dto.FriendListResponseSchema
                );
            if (path === "/friends/blocked")
                return send({ friends: [] }, dto.FriendListResponseSchema);
            if (path === "/friends/share" && method === "POST") {
                const parsed = dto.ShareMediaRequestSchema.safeParse(body);
                if (!parsed.success)
                    return send(
                        { detail: "Invalid share request" },
                        undefined,
                        422
                    );
                const media = [song, playlistSong, album, playlist].find(
                    (item) => item.publicId === parsed.data.mediaPublicId
                );
                if (!media || parsed.data.recipientPublicId !== "friend-1")
                    return send(
                        { detail: "Unknown share target" },
                        undefined,
                        404
                    );
                sentShares.push({
                    publicId: `share-${sentShares.length + 1}`,
                    senderPublicId: "fixture-user",
                    senderUsername: "fixture",
                    senderImageUrl: null,
                    recipientPublicId: "friend-1",
                    recipientUsername: "Fixture Friend",
                    mediaPublicId: media.publicId,
                    mediaName: media.name,
                    mediaImageUrl: media.imageUrl,
                    mediaType: media.type,
                    artistName: "Fixture Ensemble",
                    message: parsed.data.message,
                    seen: false,
                    dateAdded: "2026-01-01T00:00:00Z",
                });
                return send({ status: "OK" }, dto.OkResponseSchema);
            }
            if (path === "/friends/requests")
                return send(
                    { incoming: [], sent: [] },
                    dto.FriendRequestListResponseSchema
                );
            if (path === "/friends/activity")
                return send(
                    { activities: [] },
                    dto.FriendActivityResponseSchema
                );
            if (path === "/friends/search")
                return send({ results: [] }, dto.FriendSearchResponseSchema);
            if (path === "/friends/share/inbox")
                return send({ items: [] }, dto.SharedMediaInboxResponseSchema);
            if (path === "/friends/share/sent")
                return send(
                    { items: sentShares },
                    dto.SharedMediaSentResponseSchema
                );
            if (path === "/friends/listen-together/sessions")
                return send(
                    { sessions: [] },
                    dto.ListenTogetherListResponseSchema
                );
            if (path === "/friends/leaderboard")
                return send(
                    { entries: [], currentUser: null },
                    dto.LeaderboardResponseSchema
                );
            if (path === "/notifications")
                return send(
                    { items: [], unreadCount: 0, totalCount: 0 },
                    dto.NotificationPageResponseSchema
                );
            if (path === "/stats/streak")
                return send({ currentStreak: 2 }, dto.StreakResponseSchema);
            if (path.endsWith("/listening-heatmap"))
                return send(
                    { segments: [] },
                    dto.ListeningHeatmapResponseSchema
                );
            if (path === "/stats/user") {
                dto.UserStatsRequestSchema.parse(body);
                return send(
                    {
                        summary: {
                            mediasListened: 2,
                            songsListened: 2,
                            videosListened: 0,
                            minutesListened: 12,
                            avgMinutesPerSong: 6,
                            currentStreak: 2,
                        },
                        minutes: [],
                        topSongs: [],
                        topVideos: [],
                        topAlbums: [],
                        topArtists: [],
                        heatmap: [],
                    },
                    dto.UserStatsResponseSchema
                );
            }
            if (path === "/stats/v2/user") {
                const { range } = dto.UserStatsV2RequestSchema.parse(body);
                return send(
                    {
                        summary: {
                            uniqueMediasListened: 2,
                            uniqueSongsListened: 2,
                            uniqueVideosListened: 0,
                            totalListenSessions: 4,
                            totalPlayTimeMs: 720000,
                            totalPlayTimeMinutes: 12,
                            avgPlayTimePerMediaMs: 180000,
                            currentStreak: 2,
                        },
                        minutes: Array.from(
                            {
                                length:
                                    range === "today"
                                        ? 24
                                        : range === "30d"
                                          ? 5
                                          : 7,
                            },
                            (_, index) => {
                                const start = new Date(Date.UTC(2026, 10, 2));
                                const end = new Date(start);
                                if (range === "today") {
                                    start.setUTCHours(index);
                                    end.setUTCHours(index + 1);
                                } else {
                                    const days = range === "30d" ? 7 : 1;
                                    start.setUTCDate(2 + index * days);
                                    end.setUTCDate(2 + (index + 1) * days);
                                }
                                return {
                                    minutes: index === 0 ? 211.2 : 0,
                                    start: start.toISOString(),
                                    end: end.toISOString(),
                                    label:
                                        range === "today"
                                            ? `${String(index).padStart(2, "0")}:00`
                                            : range === "30d"
                                              ? `W${index + 1}`
                                              : [
                                                    "MONDAY",
                                                    "TUESDAY",
                                                    "WEDNESDAY",
                                                    "THURSDAY",
                                                    "FRIDAY",
                                                    "SATURDAY",
                                                    "SUNDAY",
                                                ][index],
                                };
                            }
                        ),
                        topSongs: [],
                        topVideos: [],
                        topAlbums: [],
                        topArtists: [],
                        heatmap: [],
                        insights: {
                            activeDays: 2,
                            longestStreak: 2,
                            longestSessionMs: 360000,
                            averageSessionMs: 180000,
                            completionRate: 100,
                            replayRate: 50,
                            discoveryCount: 2,
                            likesAdded: 0,
                            libraryAdds: 1,
                            skips: 0,
                            seekCount: 0,
                            minutesSkipped: 0,
                            peakHour: 12,
                            peakDay: "Monday",
                            nightOwlMinutes: 0,
                            earlyBirdMinutes: 12,
                        },
                    },
                    dto.UserStatsV2ResponseSchema
                );
            }
            if (
                path === "/media/artist/artist-1/page" ||
                path === "/media/artists/profile"
            ) {
                const offset = Number(url.searchParams.get("offset") ?? 0);
                const limit = Number(url.searchParams.get("limit") ?? 50);
                return send(
                    {
                        artist,
                        albums: offset === 0 ? [album] : [],
                        songs: catalog.slice(offset, offset + limit),
                        totalAlbums: 1,
                        totalSongs: catalog.length,
                        offset,
                        hasMore: offset + limit < catalog.length,
                    },
                    dto.ArtistPageResponseSchema
                );
            }
            if (path === "/media/artist/artist-1")
                return send(artist, dto.BaseArtistResponseSchema);
            if (/^\/media\/collection\/[^/]+\/items$/.test(path)) {
                const id = path.split("/")[3];
                const offset = Number(url.searchParams.get("offset") ?? 0);
                const limit = Number(url.searchParams.get("limit") ?? 100);
                const items =
                    id === "album-1" ? [song, playlistSong] : [playlistSong];
                return send(
                    {
                        collection:
                            id === "album-1"
                                ? {
                                      ...album,
                                      songs: items,
                                      total: items.length,
                                  }
                                : fullPlaylist,
                        items: items
                            .slice(offset, offset + limit)
                            .map(membership),
                        offset,
                        limit,
                        total: items.length,
                        hasMore: offset + limit < items.length,
                    },
                    dto.CollectionPageResponseSchema
                );
            }
            if (path.endsWith("/related"))
                return send(
                    {
                        songs: [song],
                        discover: [],
                        discoverProvider: null,
                        discoverStatus: "disabled",
                    },
                    dto.SongListResponseSchema
                );
            if (path === "/recommendation/artwork")
                return send(
                    { imageUrl: song.imageUrl },
                    dto.RecommendationArtworkResponseSchema
                );
            if (path === "/user/navigation/pins" && method === "POST") {
                const value = dto.PinNavigationRequestSchema.parse(body);
                if (value.publicId === album.publicId && !pins.length)
                    pins = [
                        {
                            type: "album",
                            publicId: album.publicId,
                            name: album.name,
                            imageUrl: album.imageUrl,
                            url: album.url,
                            builtinKey: null,
                        },
                    ];
                return send({ pins }, dto.NavigationPinsResponseSchema);
            }
            if (
                path.startsWith("/user/navigation/pins/") &&
                method === "DELETE"
            ) {
                pins = [];
                sentShares = [];
                return send({ pins }, dto.NavigationPinsResponseSchema);
            }
            if (path === "/bookmark/list")
                return send({ bookmarks: [] }, dto.BookmarkListResponseSchema);
            if (path === "/version/latest")
                return send(
                    { version: "1.0.0", apkUrl: "" },
                    dto.LatestVersionResponseSchema
                );
            if (path.startsWith("/featured/"))
                return send(
                    {
                        ...playlist,
                        publicId: `featured-${path.split("/").at(-1)}`,
                        medias: catalog.slice(0, 2).map((item) => ({
                            item,
                            addedAt: "2026-01-01T00:00:00Z",
                        })),
                        total: 2,
                    },
                    dto.BasePlaylistWithMediasResponseSchema
                );
            if (path.endsWith("/audio-bounds"))
                return send(
                    {
                        status: "ready",
                        start: 0,
                        end: 30,
                        duration: 30,
                        fingerprint: "fixture-pcm-v1",
                    },
                    dto.AudioBoundsResponseSchema
                );
            if (path.endsWith("/correction-context"))
                return send(
                    {
                        provider: "Fixture",
                        publicId: "lyrics-1",
                        revision: "fixture-1",
                        offset: 0,
                        lines: [
                            { timestamp_s: 0, text: "Fixture first line" },
                            { timestamp_s: 15, text: "Fixture second line" },
                        ],
                        syncStatus: "provider",
                    },
                    dto.LyricsCorrectionContextResponseSchema
                );
            if (path === "/downloader/downloads")
                return send({ downloads: [] }, dto.DownloadsResponseSchema);
            if (path === "/user/crossfade") {
                dto.UpdateCrossfadeRequestSchema.parse(body);
                return send({}, dto.OkResponseSchema);
            }
            if (path.startsWith("/user/library/media/"))
                return send({}, dto.OkResponseSchema);
            if (path === "/radio/search")
                return send({ results: [] }, dto.SearchResultsResponseSchema);
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
                        albums: [
                            { item: album, addedAt: "2026-01-01T00:00:00Z" },
                        ],
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
                const query = (url.searchParams.get("query") ?? "")
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
                        queue: queue.slice(
                            Number(url.searchParams.get("offset") ?? 0),
                            Number(url.searchParams.get("offset") ?? 0) +
                                Number(url.searchParams.get("limit") ?? 50)
                        ),
                        currentQueueMediaId,
                        offset: Number(url.searchParams.get("offset") ?? 0),
                        total: queue.length,
                        queueType: "SORTED",
                    },
                    dto.QueueResponseSchema
                );
            if (path === "/user/liked-media")
                return send({ media: [] }, dto.LikedMediaResponseSchema);
            if (path === "/user/navigation/pins")
                return send({ pins }, dto.NavigationPinsResponseSchema);
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
                    {
                        media: catalog.find((item) =>
                            path.endsWith(item.publicId)
                        ),
                    },
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
            return send(
                { detail: "Unhandled fixture endpoint" },
                undefined,
                501
            );
        } catch (error) {
            return send(
                { detail: `Invalid fixture request: ${String(error)}` },
                undefined,
                422
            );
        }
    });
    const sockets = new WebSocketServer({ server, path: "/ws" });
    sockets.on("connection", (socket) => {
        socket.send(
            JSON.stringify(
                dto.NotificationStateMessageSchema.parse({
                    unreadCount: 0,
                    totalCount: 0,
                })
            )
        );
        socket.send(
            JSON.stringify(
                dto.ListenTogetherSyncMessageSchema.parse({ sessions: [] })
            )
        );
        socket.on("message", (data) => {
            try {
                const message = JSON.parse(data.toString());
                messages.push(message);
                if (message.type === "current_queue") {
                    const payload =
                        dto.CurrentQueueMessageRequestSchema.parse(message);
                    queue = payload.queue.map((item) => ({
                        ...item,
                        media: dto.BaseSongWithAlbumResponseSchema.parse(
                            catalog.find(
                                (song) => song.publicId === item.mediaPublicId
                            ) ?? song
                        ),
                    }));
                } else if (message.type === "current_media") {
                    const payload =
                        dto.CurrentMediaMessageRequestSchema.parse(message);
                    currentQueueMediaId = payload.queueMediaId;
                    socket.send(
                        JSON.stringify(
                            dto.CurrentMediaMessageSchema.parse({
                                ...payload,
                                isPlaybackOwner: true,
                            })
                        )
                    );
                }
            } catch (error) {
                protocolErrors.push(String(error));
            }
        });
    });
    server.listen(port, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string")
        throw new Error("No fixture address");
    const url = `http://127.0.0.1:${address.port}`;
    for (const item of [
        artist,
        album,
        song,
        playlist,
        playlistSong,
        ...catalog,
    ]) {
        item.imageUrl = `${url}/assets/artwork.svg`;
    }
    for (const item of catalog) item.audioUrl = `${url}/assets/silence.wav`;
    return {
        url,
        calls,
        faults,
        unhandled,
        catalog,
        messages,
        protocolErrors,
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
