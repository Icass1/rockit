// Local deterministic backend for the production SSR smoke test. Never connects to real services.
import http from "node:http";

const calls = new Map();
let discoveryCompleted = false;
const artist = {
    type: "artist",
    provider: "Fixture",
    publicId: "00000000-0000-4000-8000-000000000001",
    url: "/artist/00000000-0000-4000-8000-000000000001",
    providerUrl: "",
    name: "Fixture artist",
    imageUrl: "/logo-192.png",
    dominantColor: "#ee1086",
};
const album = {
    type: "album",
    provider: "Fixture",
    publicId: "00000000-0000-4000-8000-000000000002",
    url: "/album/00000000-0000-4000-8000-000000000002",
    providerUrl: "",
    name: "Fixture album",
    artists: [artist],
    releaseDate: "2026-01-01",
    imageUrl: "/logo-192.png",
    dominantColor: "#ee1086",
    undownloadedCount: 0,
};
const song = {
    type: "song",
    provider: "Fixture",
    publicId: "00000000-0000-4000-8000-000000000003",
    providerUrl: "",
    name: "SSR fixture song",
    artists: [artist],
    audioUrl: null,
    downloaded: false,
    imageUrl: "/logo-192.png",
    dominantColor: "#ee1086",
    duration_ms: 60000,
    discNumber: 1,
    trackNumber: 1,
    album,
};
const recommendations = {
    songs: [song],
    discover: [],
    discoverProvider: null,
    discoverStatus: "disabled",
};
const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const key =
        url.pathname +
        (url.pathname === "/recommendation/for-you"
            ? "?external=" + url.searchParams.get("external")
            : "");
    calls.set(key, (calls.get(key) ?? 0) + 1);
    const send = (body, status = 200) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
    };
    if (url.pathname === "/fixture/status")
        return send({ calls: Object.fromEntries(calls), discoveryCompleted });
    if (url.pathname === "/user/session")
        return req.headers.cookie?.includes("session_id=fixture")
            ? send({
                  username: "SSR fixture listener",
                  image: "",
                  admin: false,
                  queueType: "SORTED",
                  repeatMode: "OFF",
                  currentTimeMs: null,
                  volume: 1,
                  showListeningHeatmap: true,
              })
            : send({ detail: "Login required" }, 401);
    if (url.pathname === "/vocabulary/user")
        return send({
            currentLang: "es",
            vocabulary: {
                LIBRARY: "Biblioteca de prueba",
                GOOD_MORNING: "Buenos días",
                GOOD_AFTERNOON: "Buenas tardes",
                GOOD_EVENING: "Buenas noches",
                FOR_YOU: "Para ti",
                NO_MEDIA_PLAYING: "NO_MEDIA_PLAYING",
            },
        });
    if (url.pathname === "/user/queue") {
        if (!req.headers.cookie?.includes("session_id=fixture"))
            return send({ detail: "Login required" }, 401);
        const empty = req.headers.cookie.includes("session_id=fixture-empty");
        return send({
            currentQueueMediaId: empty ? null : 42,
            queueType: "RANDOM",
            offset: empty ? 0 : 150,
            total: empty ? 0 : 200,
            queue: empty
                ? []
                : [
                      {
                          queueMediaId: 42,
                          listPublicId: album.publicId,
                          media: { ...song, name: "SSR current song" },
                          randomIndex: 150,
                          sortedIndex: 42,
                      },
                  ],
        });
    }
    if (url.pathname === "/stats/home")
        return send({
            songsByTimePlayed: [song],
            randomSongsLastMonth: [song],
            nostalgicMix: [],
            hiddenGems: [],
            communityTop: [],
            monthlyTop: [],
            moodSongs: [],
            recentlyClickedMedia: [],
            currentStreak: 3,
            minutesListenedThisWeek: 20,
        });
    if (url.pathname === "/user/library/medias") {
        if (!req.headers.cookie?.includes("session_id=fixture"))
            return send({ detail: "Login required" }, 401);
        if (req.headers.cookie.includes("session_id=fixture-error"))
            return send({ detail: "Library unavailable" }, 503);
        if (req.headers.cookie.includes("session_id=fixture-invalid"))
            return send({ songs: "invalid" });
        const empty = req.headers.cookie.includes("session_id=fixture-empty");
        const entry = (item) => ({ item, addedAt: "2026-01-01T00:00:00Z" });
        // Delay the response to prove the page waits for its initial library data.
        return setTimeout(
            () =>
                send({
                    albums: empty ? [] : [entry(album)],
                    playlists: [],
                    songs: empty
                        ? []
                        : [entry({ ...song, name: "SSR library song" })],
                    videos: [],
                    stations: [],
                    shared: [],
                }),
            250
        );
    }
    if (url.pathname === "/stats/user")
        return send({
            summary: {
                mediasListened: 1,
                songsListened: 1,
                videosListened: 0,
                minutesListened: 1,
                avgMinutesPerSong: 1,
                currentStreak: 1,
            },
            minutes: [],
            topSongs: [],
            topVideos: [],
            topAlbums: [
                {
                    publicId: album.publicId,
                    name: "SSR top album",
                    href: album.url,
                    value: 1,
                    imageUrl: album.imageUrl,
                    subtitle: artist.name,
                },
            ],
            topArtists: [],
            heatmap: [],
        });
    if (url.pathname === "/recommendation/for-you") {
        if (url.searchParams.get("external") === "true")
            return setTimeout(() => {
                discoveryCompleted = true;
                send(recommendations);
            }, 2000);
        return send(recommendations);
    }
    send({ detail: "Fixture has no such endpoint" }, 404);
});
server.listen(0, "127.0.0.1", () =>
    console.log(JSON.stringify({ port: server.address().port }))
);
