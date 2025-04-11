import type { SongDB, SongDBFull } from "@/lib/db/song";
import { type UserDB } from "@/lib/db/user";
import Hls from "hls.js";
import { atom } from "nanostores";
import { lang } from "./lang";
import { openRockItIndexedDB } from "@/lib/indexedDB";

let websocket: WebSocket;

export let database: IDBDatabase | undefined;

openRockItIndexedDB().then((_database) => {
    if (!_database) return;
    database = _database;
    getSongIdsInIndexedDB().then((data) => {
        songsInIndexedDB.set(data);
    });
});

startSocket();
registerServiceWorker();

if (typeof window !== "undefined") {
    window.onerror = function (msg, source, lineNo, columnNo, error) {
        fetch("/api/error/new", {
            method: "POST",
            body: JSON.stringify({
                msg,
                source,
                lineNo,
                columnNo,
                errorMessage: error?.message,
                errorCause: error?.cause,
                errorName: error?.name,
                errorStack: error?.stack,
            }),
        });
    };
}
export type QueueSong = SongDB<
    "id" | "name" | "artists" | "image" | "duration" | "albumName" | "albumId"
>;

export type QueueElement = {
    song: QueueSong;
    list: { type: string; id: string } | undefined;
    index: number;
};

type Queue = QueueElement[];
export type CurrentSong =
    | SongDB<
          | "image"
          | "id"
          | "name"
          | "artists"
          | "albumId"
          | "albumName"
          | "duration"
          | "path"
      >
    | undefined;

export type Station = {
    changeuuid: string;
    stationuuid: string;
    serveruuid: string;
    name: string;
    url: string;
    url_resolved: string;
    homepage: string;
    favicon: string;
    tags: string;
    country: string;
    countrycode: string;
    iso_3166_2: string;
    state: string;
    language: string;
    languagecodes: string;
    votes: number;
    lastchangetime: string;
    lastchangetime_iso8601: string;
    codec: string;
    bitrate: number;
    hls: number;
    lastcheckok: number;
    lastchecktime: string;
    lastchecktime_iso8601: string;
    lastcheckoktime: string;
    lastcheckoktime_iso8601: string;
    lastlocalchecktime: string;
    lastlocalchecktime_iso8601: string;
    clicktimestamp: string;
    clicktimestamp_iso8601: string;
    clickcount: number;
    clicktrend: number;
    ssl_error: number;
    geo_lat: undefined;
    geo_long: undefined;
    geo_distance: undefined;
    has_extended_info: boolean;
};

interface SongDBFullWithBlob extends SongDBFull {
    blob: Blob;
}

export type SongDBWithBlob<
    Keys extends keyof SongDBFullWithBlob = keyof SongDBFullWithBlob,
> = Pick<SongDBFullWithBlob, Keys>;

const _queue: Queue | undefined = undefined;

const send = (json: object) => {
    if (websocket && websocket.OPEN == websocket.readyState) {
        websocket.send(JSON.stringify(json));
    } else {
        if (admin.get())
            console.warn("Socket is not ready to send message", json);
    }
};

export const currentSong = atom<CurrentSong | undefined>(undefined);
export const playing = atom<boolean>(false);
export const loading = atom<boolean>(false);
export const playWhenReady = atom<boolean>(false);
export const currentTime = atom<number | undefined>(undefined);
export const totalTime = atom<number | undefined>(undefined);
export const queue = atom<Queue | undefined>(_queue);
export const queueIndex = atom<number | undefined>(undefined);
export const volume = atom<number | undefined>();
export const randomQueue = atom<boolean | undefined>(undefined);
export const repeatSong = atom<boolean | undefined>(undefined);
export const currentStation = atom<Station | undefined>(undefined);
export const songsInIndexedDB = atom<string[] | undefined>(undefined);
export const serviceWorkerRegistration = atom<
    ServiceWorkerRegistration | undefined
>(undefined);

export const admin = atom<boolean | undefined>(undefined);

let audio: HTMLAudioElement | undefined;
let audio2: HTMLAudioElement | undefined;
const hls = new Hls();

let songCounted = false;
let lastTime: number | undefined = undefined;
let timeSum = 0;
let inCrossFade = false;

console.warn("to do");
export const crossFade = atom<number | undefined>(0);

export const currentCrossFade = atom<number | undefined>(crossFade.get());

fetch(
    "/api/user?q=currentSong,currentTime,queue,queueIndex,volume,randomQueue,repeatSong,currentStation,admin"
)
    .then((userJsonResponse) => userJsonResponse.json())
    .then(
        (
            userJson: UserDB<
                | "currentSong"
                | "currentStation"
                | "currentTime"
                | "queue"
                | "queueIndex"
                | "volume"
                | "randomQueue"
                | "repeatSong"
                | "admin"
            >
        ) => {
            initAudio();

            if (!audio) {
                console.error("audio is undefined");
                return;
            }

            queueIndex.set(userJson.queueIndex);
            if (userJson?.currentTime) {
                audio.currentTime = userJson.currentTime;
            }

            admin.set(userJson.admin);

            repeatSong.set(userJson.repeatSong);
            randomQueue.set(userJson.randomQueue);

            volume.set(window.innerWidth < 768 ? 1 : (userJson?.volume ?? 1));

            if (userJson.currentSong) {
                fetch(
                    `/api/song/${userJson.currentSong}?q=image,id,name,artists,albumId,albumName,duration,path`
                ).then((response) =>
                    response.json().then((data: CurrentSong) => {
                        currentSong.set(data);
                    })
                );
            }

            if (userJson.currentStation) {
                fetch(
                    `/api/radio/stations/byuuid/${userJson.currentStation}`
                ).then((response) =>
                    response.json().then((data) => {
                        if (data && data[0]) currentStation.set(data[0]);
                    })
                );
            }

            if (userJson && userJson.queue.length > 0) {
                fetch(
                    `/api/songs?songs=${userJson.queue
                        .map((queueSong) => queueSong.song)
                        .join()}&p=id,name,artists,images,duration`
                ).then((response) =>
                    response.json().then((queueSongs: QueueSong[]) => {
                        queue.set(
                            userJson.queue
                                .map((queueSong) => {
                                    const songInfo = queueSongs
                                        .filter((song) => song)
                                        .find(
                                            (song) => song.id == queueSong.song
                                        );

                                    if (!songInfo) {
                                        return undefined;
                                    }

                                    return {
                                        song: songInfo,
                                        list: queueSong.list,
                                        index: queueSong.index,
                                    };
                                })
                                .filter((song) => typeof song != "undefined")
                        );
                    })
                );
            } else {
                queue.set([]);
            }
        }
    )
    .catch(() => {
        if (!database) return;

        const db = database;

        const userTransaction = db.transaction("user", "readonly");
        const userStore = userTransaction.objectStore("user");
        const userQuery = userStore.get("user");

        userQuery.onsuccess = async function () {
            if (!userQuery.result) {
                repeatSong.set(false);
                randomQueue.set(false);
                volume.set(1);

                queue.set([]);
            }

            const song = await getSongInIndexedDB(userQuery.result.currentSong);
            if (song) {
                currentSong.set({
                    ...song,
                    path: `/api/song/audio/${song.id}`,
                });
            } else {
                currentSong.set(undefined);
            }

            repeatSong.set(userQuery.result.repeatSong ?? false);
            randomQueue.set(userQuery.result.randomQueue ?? false);
            volume.set(userQuery.result.volume ?? 1);

            queue.set(
                userQuery.result.queue
                    .map((songId: string) => getSongInIndexedDB(songId))
                    .filter((song: SongDB) => typeof song != "undefined")
            );
        };

        userQuery.onerror = () => {
            repeatSong.set(false);
            randomQueue.set(false);
            volume.set(1);

            queue.set([]);
        };

        admin.set(false);
    });

// *****************************
// **** Store subscriptions ****
// *****************************

randomQueue.subscribe((value) => {
    if (typeof window === "undefined") return;

    updateUserIndexedDB();
    send({ randomQueue: value ? "1" : "0" });
});

repeatSong.subscribe((value) => {
    if (typeof window === "undefined") return;

    updateUserIndexedDB();
    send({ repeatSong: value ? "1" : "0" });
});

const playWhenLoaded = () => {
    initAudio();

    if (!audio) {
        console.error("audio is undefined");
        return;
    }

    if (admin.get()) console.log("playWhenLoaded");
    if (admin.get()) console.log("playWhenReady.get()", playWhenReady.get());
    if (admin.get()) console.log("6");
    loading.set(false);
    if (playWhenReady.get()) {
        if (admin.get()) console.log("7");
        audio.play().then(() => {
            if (admin.get()) console.log("8");

            playing.set(true);
        });
    }
    audio.removeEventListener("loadeddata", playWhenLoaded);
};

playing.subscribe((value) => {
    if (typeof window === "undefined") return;

    if (value) {
        document.title = currentSong.get()?.name ?? "Rock It!";
    } else {
        document.title = "Rock It!";
    }
});

currentSong.subscribe(async (value) => {
    if (typeof window === "undefined") return;

    updateUserIndexedDB();

    send({ currentSong: value?.id || "" });

    initAudio();

    if (!audio) {
        console.error("audio is undefined");
        return;
    }
    if (!audio2) {
        console.error("audio is undefined");
        return;
    }

    // if (value?.id) {
    //     // Just to fill quickly last listened songs for developing propourses
    //     if (admin.get()) console.log("song ended");
    //     send({ songEnded: value.id });
    // }

    if (!value) {
        return;
    }

    songCounted = false;
    lastTime = undefined;
    timeSum = 0;

    if ("mediaSession" in navigator && value) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: value.name,
            artist: value.artists.map((artist) => artist.name).join(", "),
            album: value.albumName,
            artwork: [
                {
                    src: `/api/image/${value.image}`, // Repalce value.image for value.image
                    sizes: "96x96",
                    type: "image/png",
                },
                {
                    src: `/api/image/${value.image}`,
                    sizes: "128x128",
                    type: "image/png",
                },
                {
                    src: `/api/image/${value.image}`,
                    sizes: "192x192",
                    type: "image/png",
                },
                {
                    src: `/api/image/${value.image}`,
                    sizes: "256x256",
                    type: "image/png",
                },
                {
                    src: `/api/image/${value.image}`,
                    sizes: "384x384",
                    type: "image/png",
                },
                {
                    src: `/api/image/${value.image}`,
                    sizes: "512x512",
                    type: "image/png",
                },
            ],
        });
    }
    if (admin.get()) console.log("inCrossFade", inCrossFade);
    if (admin.get()) console.log("audio2.paused", audio2.paused);
    if (admin.get()) console.log("audio2.src", audio2.src);
    if (inCrossFade && !audio2.paused && audio2.src) {
        if (admin.get()) console.log("audio", audio);
        if (admin.get()) console.log("audio2", audio2);
        [audio, audio2] = [audio2, audio];
        audio2.pause();
        removeEventListeners(audio2);
        audio2 = new Audio();
        addAudioEventListeners(audio);
        inCrossFade = false;
    } else if (value) {
        loading.set(true);
        if (admin.get()) console.log("1");
        playing.set(false);
        if (admin.get()) console.log("2");
        audio2.pause();
        removeEventListeners(audio2);
        audio2 = new Audio();
        if (admin.get()) console.log("3");

        const src = await getSongSrc(value.id);
        if (src) {
            audio.src = src;
        } else {
            console.error("getSongSrc is undefined");
        }
        if (admin.get()) console.log("4");
        audio.onerror = () => {
            loading.set(false);
        };
        if (admin.get()) console.log("5");
        audio.addEventListener("loadeddata", playWhenLoaded);
    }
});

currentStation.subscribe(async (value) => {
    if (typeof window === "undefined") return;

    initAudio();

    if (!audio) {
        console.error("audio is undefined");
        return;
    }

    updateUserIndexedDB();
    send({ currentStation: value?.stationuuid });

    if (!value) {
        return;
    }

    clearCurrentSong();

    // if (admin.get()) console.log(value.url_resolved);

    if (value.url_resolved) {
        const isHls = await isHlsContent(value.url_resolved);
        if (Hls.isSupported() && isHls) {
            // if (admin.get()) console.log("Hls");
            hls.loadSource(value.url_resolved);
            hls.attachMedia(audio);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                initAudio();

                if (!audio) {
                    console.error("audio is undefined");
                    return;
                }

                audio
                    .play()
                    .catch((err) => console.error("Error playing audio:", err));
            });
        } else {
            // if (admin.get()) console.log("not Hls");
            audio.src = value.url_resolved;
            // audio.play();
            audio.onloadeddata = () => {
                initAudio();

                if (!audio) {
                    console.error("audio is undefined");
                    return;
                }

                // if (admin.get()) console.log("onloadeddata");
                audio.play();
            };
            audio.oncanplay = () => {
                initAudio();

                if (!audio) {
                    console.error("audio is undefined");
                    return;
                }

                // if (admin.get()) console.log("oncanplay");
                audio.play();
            };
        }
    }
});

queue.subscribe((value) => {
    if (typeof window === "undefined") return;

    if (!value) return;

    updateUserIndexedDB();
    send({
        queue: value
            .map((value) => {
                if (value?.song && value?.list) {
                    return {
                        song: value.song.id,
                        index: value.index,
                        list: value.list,
                    };
                }
            })
            .filter((song) => song),
    });
});

queueIndex.subscribe((value) => {
    if (typeof window === "undefined") return;

    updateUserIndexedDB();
    send({ queueIndex: value });
});

volume.subscribe((value) => {
    if (typeof window === "undefined") return;

    initAudio();

    if (!audio) {
        console.error("audio is undefined");
        return;
    }

    updateUserIndexedDB();
    if (window.innerWidth < 768) return;
    if (typeof value == "undefined") return;
    audio.volume = value;
    send({ volume: value });
});

// **************************
// **** Helper functions ****
// **************************

export function initAudio() {
    if (!audio) {
        console.warn("initAudio");
        audio = new Audio();
        audio.id = new Date().getTime().toString();
        addAudioEventListeners(audio);
    }
    if (!audio2) {
        console.warn("initAudio2");
        audio2 = new Audio();
    }
}

export function updateUserIndexedDB() {
    if (!database) return;

    const db = database;
    const userTransaction = db.transaction("user", "readwrite");
    const userStore = userTransaction.objectStore("user");

    const userQuery = userStore.get("user");

    userQuery.onsuccess = function () {
        const user = {
            id: "user",
            username: "testuser",
            currentSong: currentSong.get()?.id ?? userQuery.result?.currentSong,
            currentTime: currentTime.get() ?? userQuery.result?.currentTime,
            lang: lang.get() ?? userQuery.result?.lang,
            queue:
                queue.get()?.map((value) => {
                    if (value?.song && value?.list) {
                        return {
                            song: value.song.id,
                            index: value.index,
                            list: value.list,
                        };
                    }
                }) ?? userQuery.result?.queue,
            queueIndex: queueIndex.get() ?? userQuery.result?.queueIndex,
            randomQueue: randomQueue.get() ?? userQuery.result?.randomQueue,
            volume: volume.get() ?? userQuery.result?.volume,
            repeatSong: repeatSong.get() ?? userQuery.result?.repeatSong,
            currentStation:
                currentStation.get() ?? userQuery.result?.currentStation,
        };

        userStore.put(user);
    };
}

async function isHlsContent(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

    try {
        // if (admin.get()) console.log("1111111111111111111111");
        const response = await fetch(url, {
            method: "GET",
            headers: { Range: "bytes=0-512" },
            signal: controller.signal,
        });
        // if (admin.get()) console.log("222222222222222");

        const reader = response.body?.getReader();
        if (!reader) return false;

        let text = "";
        let receivedLength = 0;
        const maxLength = 512;

        while (receivedLength < maxLength) {
            const { done, value } = await reader.read();
            if (done) break;

            text += new TextDecoder().decode(value, { stream: true });
            receivedLength += value.length;

            if (text.includes("#EXTM3U") && text.includes("#EXT-X-")) {
                return true; // Early exit
            }
        }
    } catch (error) {
        console.error("Error fetching content:", error);
    } finally {
        clearTimeout(timeoutId);
    }
    return false;
}

export async function play() {
    initAudio();

    if (!audio) {
        console.error("audio is undefined");
        return;
    }
    if (!audio2) {
        console.error("audio is undefined");
        return;
    }
    if (admin.get()) console.log("play");
    await audio.play();
    await audio2.play();
}

export function pause() {
    initAudio();

    if (!audio) {
        console.error("audio is undefined");
        return;
    }
    if (!audio2) {
        console.error("audio is undefined");
        return;
    }
    if (admin.get()) console.log("pause");
    audio.pause();
    audio2.pause();
}

export function setTime(time: number) {
    initAudio();

    if (!audio) {
        console.error("audio is undefined");
        return;
    }

    console.log("1", audio.currentTime);
    audio.currentTime = time;
    console.log("2", audio.currentTime);
}

export function clearCurrentSong() {
    currentSong.set(undefined);
    queue.set([]);
    currentTime.set(0);
    send({ currentTime: 0 });
}

export async function prev() {
    const tempQueue = queue.get();
    if (typeof queueIndex.get() == "undefined" || tempQueue == undefined) {
        return;
    }

    timeSum = 0;
    songCounted = false;
    lastTime = 0;

    const _currentTime = currentTime.get();

    if (_currentTime && _currentTime > 5) {
        setTime(0);
        return;
    }

    const currentSongIndexInQueue = tempQueue.findIndex(
        (song) => song.index == queueIndex.get()
    );

    if (currentSongIndexInQueue - 1 < 0) {
        queueIndex.set(tempQueue[tempQueue.length - 1].index);
    } else {
        queueIndex.set(tempQueue[currentSongIndexInQueue - 1].index);
    }

    const newSongId = tempQueue.find((song) => song.index == queueIndex.get())
        ?.song.id;
    if (!newSongId) {
        return;
    }

    await fetch(`/api/song/${newSongId}`)
        .then((response) => response.json())
        .then((data: SongDB) => {
            // if (admin.get()) console.log("Playwhenready 1");
            playWhenReady.set(true);
            currentSong.set(data);
        })
        .catch(async () => {
            const song = await getSongInIndexedDB(newSongId);
            if (song) {
                currentSong.set({
                    ...song,
                    path: `/api/song/audio/${song.id}`,
                });
            } else {
                currentSong.set(undefined);
            }

            playWhenReady.set(true);
        });
}
const getUA = () => {
    let device = "Unknown";
    const ua: { [key: string]: RegExp } = {
        "Generic Linux": /Linux/i,
        Android: /Android/i,
        BlackBerry: /BlackBerry/i,
        Bluebird: /EF500/i,
        "Chrome OS": /CrOS/i,
        Datalogic: /DL-AXIS/i,
        Honeywell: /CT50/i,
        iPad: /iPad/i,
        iPhone: /iPhone/i,
        iPod: /iPod/i,
        macOS: /Macintosh/i,
        Windows: /IEMobile|Windows/i,
        Zebra: /TC70|TC55/i,
    };
    Object.keys(ua).map(
        (v: string) => navigator.userAgent.match(ua[v]) && (device = v)
    );
    return device;
};
function startSocket() {
    if (typeof window === "undefined") return null;

    if (!window.navigator.onLine) return;
    if (location.protocol == "https:") {
        websocket = new WebSocket(`wss://${location.host}/ws`);
    } else {
        websocket = new WebSocket(`ws://${location.host}/ws`);
    }
    websocket.onopen = () => {
        send({
            deviceName: getUA(),
        });
    };
    websocket.onmessage = (event) => {
        // if (admin.get()) console.log("Web socket message", event.data);
        const data = JSON.parse(event.data);
        if (data.currentTime) {
            setTime(data.currentTime);
        }
    };
    websocket.onclose = () => {
        startSocket();
    };
}
export async function next(songEnded = false) {
    const tempQueue = queue.get();
    if (typeof queueIndex.get() == "undefined" || tempQueue == undefined) {
        return;
    }

    const currentSongIndexInQueue = tempQueue.findIndex(
        (song) => song.index == queueIndex.get()
    );
    if (currentSongIndexInQueue + 1 >= tempQueue.length) {
        queueIndex.set(tempQueue[0].index);
    } else {
        queueIndex.set(tempQueue[currentSongIndexInQueue + 1].index);
    }
    const newSongId = tempQueue.find((song) => song.index == queueIndex.get())
        ?.song.id;
    if (!newSongId) {
        return;
    }

    if (admin.get()) console.log({ newSongId, songEnded });

    await fetch(`/api/song/${newSongId}`)
        .then((response) => response.json())
        .then((data) => {
            const _crossFade = currentCrossFade.get();
            if (_crossFade && _crossFade > 0 && songEnded) {
                inCrossFade = true;
                if (admin.get()) console.log("Playwhenready 2");

                playWhenReady.set(false);
            } else {
                if (admin.get()) console.log("Playwhenready 3");

                inCrossFade = false;
                playWhenReady.set(true);
            }
            currentSong.set(data);
        })
        .catch(async () => {
            const song = await getSongInIndexedDB(newSongId);
            if (song) {
                currentSong.set({
                    ...song,
                    path: `/api/song/audio/${song.id}`,
                });
            } else {
                currentSong.set(undefined);
            }

            const _crossFade = currentCrossFade.get();
            if (_crossFade && _crossFade > 0 && songEnded) {
                inCrossFade = true;
                if (admin.get()) console.log("Playwhenready 2");

                playWhenReady.set(false);
            } else {
                if (admin.get()) console.log("Playwhenready 3");

                inCrossFade = false;
                playWhenReady.set(true);
            }
        });
}

// function fillImagesIndexedDB(imageStore: IDBObjectStore) {
//     console.warn("fillImagesIndexedDB");
//     if (!imageStore.indexNames.contains("id"))
//         imageStore.createIndex("id", "id", { unique: true });
//     if (!imageStore.indexNames.contains("blob"))
//         imageStore.createIndex("blob", "blob", { unique: false });
// }

// function fillSongsIndexedDB(songsStore: IDBObjectStore) {
//     console.warn("fillSongsIndexedDB");
//     if (!songsStore.indexNames.contains("id"))
//         songsStore.createIndex("id", "id", { unique: true });
//     if (!songsStore.indexNames.contains("name"))
//         songsStore.createIndex("name", "name", { unique: false });
//     if (!songsStore.indexNames.contains("artists"))
//         songsStore.createIndex("artists", "artists", { unique: false });
//     if (!songsStore.indexNames.contains("images"))
//         songsStore.createIndex("images", "images", { unique: false });
//     if (!songsStore.indexNames.contains("image"))
//         songsStore.createIndex("image", "image", { unique: false });
//     if (!songsStore.indexNames.contains("duration"))
//         songsStore.createIndex("duration", "duration", {
//             unique: false,
//         });
//     if (!songsStore.indexNames.contains("blob"))
//         songsStore.createIndex("blob", "blob", { unique: false });
//     if (!songsStore.indexNames.contains("albumId"))
//         songsStore.createIndex("albumId", "albumId", { unique: false });
//     if (!songsStore.indexNames.contains("albumName"))
//         songsStore.createIndex("albumName", "albumName", {
//             unique: false,
//         });
//     if (!songsStore.indexNames.contains("lyrics"))
//         songsStore.createIndex("lyrics", "lyrics", { unique: false });
//     if (!songsStore.indexNames.contains("dynamicLyrics"))
//         songsStore.createIndex("dynamicLyrics", "dynamicLyrics", {
//             unique: false,
//         });
// }

// function fillLangIndexedDB(langStore: IDBObjectStore) {
//     console.warn("fillLangIndexedDB");
//     if (!langStore.indexNames.contains("lang"))
//         langStore.createIndex("lang", "lang", { unique: true });
//     if (!langStore.indexNames.contains("langData"))
//         langStore.createIndex("langData", "langData", {
//             unique: false,
//         });
// }

// function fillUserIndexedDB(userStore: IDBObjectStore) {
//     console.warn("fillUserIndexedDB");
//     if (!userStore.indexNames.contains("id"))
//         userStore.createIndex("id", "id", { unique: true });
//     if (!userStore.indexNames.contains("username"))
//         userStore.createIndex("username", "username", {
//             unique: false,
//         });
//     if (!userStore.indexNames.contains("currentSong"))
//         userStore.createIndex("currentSong", "currentSong", {
//             unique: false,
//         });
//     if (!userStore.indexNames.contains("lang"))
//         userStore.createIndex("lang", "lang", { unique: false });
//     if (!userStore.indexNames.contains("currentTime"))
//         userStore.createIndex("currentTime", "currentTime", {
//             unique: false,
//         });
//     if (!userStore.indexNames.contains("queue"))
//         userStore.createIndex("queue", "queue", { unique: false });
//     if (!userStore.indexNames.contains("queueIndex"))
//         userStore.createIndex("queueIndex", "queueIndex", {
//             unique: false,
//         });
//     if (!userStore.indexNames.contains("volume"))
//         userStore.createIndex("volume", "volume", { unique: false });
//     if (!userStore.indexNames.contains("randomQueue"))
//         userStore.createIndex("randomQueue", "randomQueue", {
//             unique: false,
//         });
//     if (!userStore.indexNames.contains("repeatSong"))
//         userStore.createIndex("repeatSong", "repeatSong", {
//             unique: false,
//         });
//     if (!userStore.indexNames.contains("currentStation"))
//         userStore.createIndex("currentStation", "currentStation", {
//             unique: false,
//         });
//     if (!userStore.indexNames.contains("admin"))
//         userStore.createIndex("admin", "admin", { unique: false });
// }
// function openRockItIndexedDB(): Promise<IDBDatabase | null> {
//     if (typeof window === "undefined")
//         return new Promise((resolve) => resolve(null));

//     const dbOpenRequest = indexedDB.open("RockIt", 14);

//     return new Promise((resolve, reject) => {
//         dbOpenRequest.onupgradeneeded = function (event) {
//             const db = dbOpenRequest.result;
//             console.error("dbOpenRequest.onupgradeneeded 1");

//             const transaction = (event?.target as IDBOpenDBRequest)
//                 ?.transaction as IDBTransaction;

//             ////////////////
//             // songsStore //
//             ////////////////
//             if (!db.objectStoreNames.contains("songs")) {
//                 const songsStore = db.createObjectStore("songs", {
//                     keyPath: "id",
//                 });
//                 fillSongsIndexedDB(songsStore);
//             } else {
//                 fillSongsIndexedDB(transaction.objectStore("songs"));
//             }

//             ////////////////
//             // imageStore //
//             ////////////////
//             if (!db.objectStoreNames.contains("images")) {
//                 const imageStore = db.createObjectStore("images", {
//                     keyPath: "id",
//                 });
//                 fillImagesIndexedDB(imageStore);
//             } else {
//                 fillImagesIndexedDB(transaction.objectStore("images"));
//             }

//             ///////////////
//             // userStore //
//             ///////////////
//             if (!db.objectStoreNames.contains("user")) {
//                 const userStore = db.createObjectStore("user", {
//                     keyPath: "id",
//                 });
//                 fillUserIndexedDB(userStore);
//             } else {
//                 fillUserIndexedDB(transaction.objectStore("user"));
//             }

//             ///////////////
//             // langStore //
//             ///////////////
//             if (!db.objectStoreNames.contains("lang")) {
//                 const langStore = db.createObjectStore("lang", {
//                     keyPath: "lang",
//                 });
//                 fillLangIndexedDB(langStore);
//             } else {
//                 fillLangIndexedDB(transaction.objectStore("lang"));
//             }
//             // No manual transaction.commit() needed
//             transaction.oncomplete = () => {
//                 console.log("Upgrade transaction completed.");
//             };
//         };

//         dbOpenRequest.onsuccess = function () {
//             resolve(dbOpenRequest.result);
//         };
//         dbOpenRequest.onerror = function () {
//             reject(dbOpenRequest.error);
//         };
//     });
// }

export async function saveSongToIndexedDB(
    song: SongDB<
        | "id"
        | "name"
        | "artists"
        | "image"
        | "duration"
        | "albumName"
        | "albumId"
    >,
    force = false
) {
    if (!database) return;

    const currentSongsInIndexedDB = await getSongIdsInIndexedDB();

    if (currentSongsInIndexedDB.includes(song.id) && !force) return;

    fetch(`/api/song/audio/${song.id}`).then((response) => {
        if (response.ok) {
            response.blob().then(async (songBlob) => {
                if (!database) return;
                const songToSave = {
                    id: song.id,
                    name: song.name,
                    artists: song.artists,
                    image: song.image,
                    duration: song.duration,
                    blob: songBlob,
                    albumName: song.albumName,
                    albumId: song.albumId,
                };
                const songsTx = database.transaction("songs", "readwrite");
                const songsStore = songsTx.objectStore("songs");
                songsStore.put(songToSave);
                songsInIndexedDB.set(await getSongIdsInIndexedDB());
            });
        }
    });

    const imageRequest = await fetch(`/api/image/${song.image}`);
    if (!imageRequest.ok) {
        console.warn("Error requesting image");
        return;
    }

    const imageBlob = await imageRequest.blob();

    const imageToSave = {
        id: song.image,
        blob: imageBlob,
    };

    if (admin.get()) console.log("imageToSave", imageToSave);

    const imagesTx = database.transaction("images", "readwrite");
    const imagesStore = imagesTx.objectStore("images");
    imagesStore.put(imageToSave);
}

export async function getSongInIndexedDB(
    id: string
): Promise<
    | SongDBWithBlob<
          | "id"
          | "name"
          | "blob"
          | "artists"
          | "images"
          | "duration"
          | "image"
          | "albumName"
          | "albumId"
      >
    | undefined
> {
    if (!database) return;

    const db = database;
    const tx = db.transaction("songs", "readonly");
    const store = tx.objectStore("songs");
    return new Promise((resolve, reject) => {
        const query = store.get(id);

        query.onsuccess = function () {
            resolve(query.result);
        };
        query.onerror = function (event) {
            reject(event);
        };
    });
}

export async function getSongIdsInIndexedDB(): Promise<string[]> {
    if (!database) return [];

    const db = database;
    const tx = db.transaction("songs", "readonly");
    const store = tx.objectStore("songs");

    return new Promise((resolve, reject) => {
        const query = store.getAll();

        query.onsuccess = function () {
            resolve(query.result.map((song) => song.id));
        };
        query.onerror = function (event) {
            reject(event);
        };
    });
}

async function registerServiceWorker() {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
        const version = 1;

        try {
            const updatedServiceWorker = localStorage.getItem(
                "updatedServiceWorker"
            );

            if (
                updatedServiceWorker &&
                Number(updatedServiceWorker) != version
            ) {
                console.log("Unregistering service worker");

                await Promise.all(
                    (await navigator.serviceWorker.getRegistrations()).map(
                        (worker) => worker.unregister()
                    )
                );

                localStorage.setItem(
                    "updatedServiceWorker",
                    version.toString()
                );
            }
        } catch (error) {
            console.error("Unregistering service worker", error);
            await Promise.all(
                (await navigator.serviceWorker.getRegistrations()).map(
                    (worker) => worker.unregister()
                )
            );
            localStorage.setItem("updatedServiceWorker", version.toString());
        }

        try {
            const registration = await navigator.serviceWorker.register(
                "/service-worker.js",
                {
                    scope: "/",
                    type: "module",
                }
            );
            serviceWorkerRegistration.set(registration);

            if (registration.installing) {
                // if (admin.get()) console.log("Service worker installing");
            } else if (registration.waiting) {
                // if (admin.get()) console.log("Service worker installed");
            } else if (registration.active) {
                // if (admin.get()) console.log("Service worker active");
            }
        } catch (error) {
            console.error(`Registration failed with ${error}`);
        }
    }
}

async function getSongSrc(songID: string) {
    if (songsInIndexedDB.get()?.includes(songID)) {
        const song = await getSongInIndexedDB(songID);
        if (!song) return;
        const audioURL = URL.createObjectURL(song.blob);
        return audioURL;
    } else {
        return `/api/song/audio/${songID}`;
    }
}

// *************************
// **** Event listeners ****
// *************************
if (typeof navigator !== "undefined") {
    navigator.mediaSession.setActionHandler("play", async () => {
        play();
    });

    navigator.mediaSession.setActionHandler("pause", async () => {
        pause();
    });

    navigator.mediaSession.setActionHandler("previoustrack", async () => {
        await prev();
        await play();
    });

    navigator.mediaSession.setActionHandler("nexttrack", async () => {
        await next();
        await play();
    });

    navigator.mediaSession.setActionHandler("seekto", async (event) => {
        if (event.seekTime) setTime(event.seekTime);
    });
}
function onLoadedData() {
    // if (admin.get()) console.log(
    //     "Updating crossFade from",
    //     currentCrossFade.get(),
    //     "to",
    //     crossFade.get()
    // );
    currentCrossFade.set(crossFade.get());
}

function onCanplay() {
    initAudio();

    if (!audio) {
        console.error("audio is undefined");
        return;
    }

    if ("mediaSession" in navigator && !isNaN(audio.duration)) {
        navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: 1,
            position: audio.currentTime,
        });
    }
}

let audioIsInit = false;
async function onTimeupdate() {
    initAudio();

    if (!audio) {
        console.error("audio is undefined");
        return;
    }
    if (!audio2) {
        console.error("audio is undefined");
        return;
    }
    const _crossFade = currentCrossFade.get();

    currentTime.set(audio.currentTime);

    updateUserIndexedDB();
    send({
        currentTime: audio.currentTime,
    });
    const userVolume = volume.get();
    if (userVolume && _crossFade && _crossFade > 0 && !repeatSong.get()) {
        if (audio.duration - audio.currentTime < _crossFade) {
            audio.volume =
                ((-userVolume / _crossFade) *
                    (audio.currentTime - audio.duration)) **
                2;
            if (
                Math.abs(
                    audio.currentTime -
                        (audio.duration - _crossFade) -
                        audio2.currentTime
                ) > 1 &&
                audioIsInit &&
                !audio2.paused &&
                !audio2.paused
            ) {
                // if (admin.get()) console.log("audio2.currentTime = audio.currentTime");
                // if (admin.get()) console.log("audio2.currentTime", audio2.currentTime);
                // if (admin.get()) console.log("audio.currentTime", audio.currentTime);
                audio2.currentTime =
                    audio.currentTime - (audio.duration - _crossFade);
            }
            const tempQueue = queue.get();

            if (!audioIsInit && !audio.paused && tempQueue) {
                audioIsInit = true;
                // if (admin.get()) console.log("Init audio 2");
                const currentSongIndexInQueue = tempQueue.findIndex(
                    (song) => song.index == queueIndex.get()
                );
                // if (admin.get()) console.log("currentSongIndexInQueue", currentSongIndexInQueue);

                let id;
                if (currentSongIndexInQueue + 1 >= tempQueue.length) {
                    id = tempQueue[0].song.id;
                } else {
                    id = tempQueue[currentSongIndexInQueue + 1].song.id;
                }
                const src = await getSongSrc(id);

                if (src) {
                    audio2.src = src;
                    audio2.onloadeddata = () => {
                        if (admin.get()) console.log("onloadeddata");
                        if (!audio2) audio2 = new Audio();
                        audio2.play();
                    };
                } else {
                    console.error("getSongSrc is undefined");
                }
            }
            audio2.volume =
                ((userVolume / _crossFade) *
                    (audio.currentTime - audio.duration) +
                    userVolume) **
                2;
        } else {
            audio.volume = userVolume;
            audioIsInit = false;
            if (!audio2.paused) {
                if (admin.get()) console.log("audio2.pause()");
                audio2.pause();
            }
        }
    } else {
        if (userVolume) audio.volume = userVolume;
        audioIsInit = false;
        if (!audio2.paused) {
            if (admin.get()) console.log("audio2.pause()");
            audio2.pause();
        }
    }
    const songId = currentSong.get()?.id;
    if (
        lastTime &&
        audio.currentTime - lastTime < 1 &&
        audio.currentTime - lastTime > 0
    )
        timeSum += audio.currentTime - lastTime;
    lastTime = audio.currentTime;
    if (timeSum > audio.duration * 0.5 && !songCounted) {
        if (songId) {
            songCounted = true;
            send({
                songEnded: songId,
            });
        }
    }
    if ("mediaSession" in navigator) {
        if (!isNaN(audio.duration)) {
            navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: 1,
                position: audio.currentTime,
            });
        }
    }
}

function onPlay() {
    playing.set(true);
    if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
    }
}

function onPause() {
    // if (admin.get()) console.log("audio pause", audio);
    playing.set(false);
    if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
    }
}

async function onEnded() {
    if (repeatSong.get()) {
        setTime(0);
        play();
        return;
    }
    await next(true);
    const nextSong = currentSong.get();
    if ("mediaSession" in navigator && nextSong) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: nextSong.name,
            artist: nextSong.artists.map((artist) => artist.name).join(", "),
            album: nextSong.albumName,
            artwork: [
                {
                    src: `/api/image/${nextSong.image}`,
                    // Asegúrate de usar la URL correcta de la imagen
                    sizes: "96x96",
                    type: "image/png",
                }, // Asegúrate de definir más tamaños de imagen si es necesario
            ],
        });
    }
}

function onError(event: ErrorEvent) {
    console.error("Error loading audio", event);
}

function addAudioEventListeners(audio: HTMLAudioElement) {
    console.warn("addAudioEventListeners", audio);

    if (typeof window === "undefined") return;

    // if (admin.get()) console.log("AAAAAAAAAAAAAAA", audio.paused);
    if (!audio.paused) {
        playing.set(true);
    }

    // if (admin.get()) console.log(
    //     "Updating crossFade from",
    //     currentCrossFade.get(),
    //     "to",
    //     crossFade.get()
    // );
    currentCrossFade.set(crossFade.get());

    audio.addEventListener("loadeddata", onLoadedData);
    audio.addEventListener("canplay", onCanplay);
    audio.addEventListener("timeupdate", onTimeupdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
}

function removeEventListeners(audio: HTMLAudioElement) {
    audio.removeEventListener("loadeddata", onLoadedData);
    audio.removeEventListener("canplay", onCanplay);
    audio.removeEventListener("timeupdate", onTimeupdate);
    audio.removeEventListener("play", onPlay);
    audio.removeEventListener("pause", onPause);
    audio.removeEventListener("ended", onEnded);
    audio.removeEventListener("error", onError);
}
