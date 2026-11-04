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
