import { atom } from "nanostores";
import type { SongDB, SongDBFull, UserDB } from "@/lib/db";
import Hls from "hls.js";

let websocket: WebSocket;

const database = await openIndexedDB();
startSocket();
registerServiceWorker();

export type QueueSong = SongDB<
    "id" | "name" | "artists" | "image" | "duration"
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
    geo_lat: any;
    geo_long: any;
    geo_distance: any;
    has_extended_info: boolean;
};

interface SongDBFullWithBlob extends SongDBFull {
    blob: Blob;
}

export type SongDBWithBlob<
    Keys extends keyof SongDBFullWithBlob = keyof SongDBFullWithBlob,
> = Pick<SongDBFullWithBlob, Keys>;

const userJsonResponse = await fetch(
    "/api/user?q=currentSong,currentTime,queue,queueIndex,volume,randomQueue"
);
let userJson;
if (userJsonResponse.ok) {
    userJson = (await userJsonResponse.json()) as UserDB<
        | "currentSong"
        | "currentTime"
        | "queue"
        | "queueIndex"
        | "volume"
        | "randomQueue"
    >;
}

let _currentSong = undefined;
let _queue: Queue = [];
let _queueIndex = userJson?.queueIndex ?? 0;

try {
    if (userJson?.currentSong) {
        _currentSong = (await (
            await fetch(
                `/api/song/${userJson.currentSong}?q=image,id,name,artists,albumId,albumName,duration`
            )
        ).json()) as CurrentSong;
    }
} catch {
    _currentSong = undefined;
}

if (userJson && userJson.queue.length > 0) {
    const _queueResponse = await fetch(
        `/api/songs?songs=${userJson.queue
            .map((queueSong) => queueSong.song)
            .join()}&p=id,name,artists,images,duration`
    );
    const _queueJson = (await _queueResponse.json()) as QueueSong[];

    _queue = userJson.queue
        .map((queueSong) => {
            const songInfo = _queueJson
                .filter((song) => song)
                .find((song) => song.id == queueSong.song);

            if (!songInfo) {
                return undefined;
            }

            return {
                song: songInfo,
                list: queueSong.list,
                index: queueSong.index,
            };
        })
        .filter((song) => typeof song != "undefined");
}

const send = (json: any) => {
    if (websocket && websocket.OPEN == websocket.readyState) {
        websocket.send(JSON.stringify(json));
    }
};

export const currentSong = atom<CurrentSong>(_currentSong);
export const playing = atom<boolean>(false);
export const loading = atom<boolean>(false);
export const playWhenReady = atom<boolean>(false);
export const currentTime = atom<number | undefined>(undefined);
export const totalTime = atom<number | undefined>(undefined);
export const queue = atom<Queue>(_queue);
export const queueIndex = atom<number | undefined>(_queueIndex);
export const volume = atom<number>(
    window.innerWidth < 768 ? 1 : (userJson?.volume ?? 1)
);
export const randomQueue = atom<boolean>(
    userJson?.randomQueue == "1" ? true : false
);

export const currentStation = atom<Station | undefined>(undefined);

export const songsInIndexedDB = atom<string[]>(await getSongIdsInIndexedDB());

const audio = new Audio(
    _currentSong?.id ? `/api/song/audio/${_currentSong?.id}` : undefined
);
const hls = new Hls();

let songCounted = false;
let lastTime: number | undefined = undefined;
let timeSum = 0;

if (userJson?.currentTime) {
    audio.currentTime = userJson.currentTime;
}

// *****************************
// **** Store subscriptions ****
// *****************************

randomQueue.subscribe((value) => {
    send({ randomQueue: value ? "1" : "0" });
});

currentSong.subscribe(async (value) => {
    send({ currentSong: value?.id });

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

    if (value) {
        loading.set(true);
        playing.set(false);

        if (songsInIndexedDB.get().includes(value.id)) {
            const song = await getSongInIndexedDB(value.id);
            const audioURL = URL.createObjectURL(song.blob);
            audio.src = audioURL;
        } else {
            audio.src = `/api/song/audio/${value.id}`;
        }
        audio.onerror = () => {
            loading.set(false);
            // Notify the user that the song couldn't be loaded
        };
        audio.onloadeddata = () => {
            loading.set(false);
            if (playWhenReady.get()) {
                audio.play().then(() => {
                    playing.set(true);
                });
            }
        };
    }
});

currentStation.subscribe(async (value) => {
    send({ currentStation: value?.stationuuid });

    if (!value) {
        return;
    }

    clearCurrentSong();

    if (value?.url_resolved) {
        const isHls = await isHlsContent(value.url_resolved);

        if (Hls.isSupported() && isHls) {
            hls.loadSource(value.url_resolved);
            hls.attachMedia(audio);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                audio
                    .play()
                    .catch((err) => console.error("Error playing audio:", err));
            });
        } else {
            audio.src = value.url_resolved;
        }
    }
});

queue.subscribe((value) => {
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
    send({ queueIndex: value });
});

volume.subscribe((value) => {
    if (window.innerWidth < 768) {
        return;
    }
    audio.volume = value;
    send({ volume: value });
});

// **************************
// **** Helper functions ****
// **************************

async function isHlsContent(url: string) {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { Range: "bytes=0-512" },
        });
        const text = await response.text();
        return text.includes("#EXTM3U") && text.includes("#EXT-X-");
    } catch (error) {
        console.error("Error fetching content:", error);
        return false;
    }
}

export const play = async () => {
    await audio.play();
};

export const pause = () => {
    audio.pause();
};

export function setTime(time: number) {
    audio.currentTime = time;
}

export function clearCurrentSong() {
    currentSong.set(undefined);
    queue.set([]);
    currentTime.set(0);
    send({ currentTime: 0 });
}

export async function prev() {
    if (!queueIndex.get() && queueIndex.get() != 0) {
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

    const currentSongIndexInQueue = queue
        .get()
        .findIndex((song) => song.index == queueIndex.get());

    if (currentSongIndexInQueue - 1 < 0) {
        queueIndex.set(queue.get()[queue.get().length - 1].index);
    } else {
        queueIndex.set(queue.get()[currentSongIndexInQueue - 1].index);
    }

    const newSongId = queue.get().find((song) => song.index == queueIndex.get())
        ?.song.id;
    if (!newSongId) {
        return;
    }

    await fetch(`/api/song/${newSongId}`)
        .then((response) => response.json())
        .then((data: SongDB) => {
            playWhenReady.set(true);
            currentSong.set(data);
        });
}

function startSocket() {
    if (!window.navigator.onLine) return;

    if (location.protocol == "https:") {
        websocket = new WebSocket(`wss://${location.host}/ws`);
    } else {
        websocket = new WebSocket(`ws://${location.host}/ws`);
    }

    websocket.onopen = () => {
        // console.log("Web socket open");
    };
    websocket.onmessage = () => {
        // console.log("Web socket message", event.data);
    };
    websocket.onclose = () => {
        // console.log("Web socket close");
        startSocket();
    };
}

export async function next() {
    if (!queueIndex.get() && queueIndex.get() != 0) {
        return;
    }

    const currentSongIndexInQueue = queue
        .get()
        .findIndex((song) => song.index == queueIndex.get());

    if (currentSongIndexInQueue + 1 >= queue.get().length) {
        queueIndex.set(queue.get()[0].index);
    } else {
        queueIndex.set(queue.get()[currentSongIndexInQueue + 1].index);
    }

    const newSongId = queue.get().find((song) => song.index == queueIndex.get())
        ?.song.id;
    if (!newSongId) {
        return;
    }

    await fetch(`/api/song/${newSongId}`)
        .then((response) => response.json())
        .then((data: SongDB) => {
            playWhenReady.set(true);
            currentSong.set(data);
        });
}

function openIndexedDB(): Promise<IDBDatabase> {
    const dbOpenRequest = indexedDB.open("RockIt", 1);

    dbOpenRequest.onupgradeneeded = function () {
        const db = dbOpenRequest.result;
        const songsStore = db.createObjectStore("songs", { keyPath: "id" });
        songsStore.createIndex("id", "id", { unique: true });
        songsStore.createIndex("name", "name", { unique: false });
        songsStore.createIndex("artists", "artists", { unique: false });
        songsStore.createIndex("images", "images", { unique: false });
        songsStore.createIndex("image", "image", { unique: false });
        songsStore.createIndex("duration", "duration", { unique: false });
        songsStore.createIndex("blob", "blob", { unique: false });

        const imageStore = db.createObjectStore("images", { keyPath: "id" });
        imageStore.createIndex("id", "id", { unique: true });
        imageStore.createIndex("blob", "blob", { unique: false });
    };
    return new Promise((resolve, reject) => {
        dbOpenRequest.onsuccess = function () {
            resolve(dbOpenRequest.result);
        };
        dbOpenRequest.onerror = function () {
            reject(dbOpenRequest.error);
        };
    });
}

export async function saveSongToIndexedDB(
    song: SongDB<"id" | "name" | "artists" | "image" | "duration">
) {
    fetch(`/api/song/audio/${song.id}`).then((response) => {
        if (response.ok) {
            response.blob().then(async (songBlob) => {
                const songToSave = {
                    id: song.id,
                    name: song.name,
                    artists: song.artists,
                    image: song.image,
                    duration: song.duration,
                    blob: songBlob,
                };
                const songsTx = database.transaction("songs", "readwrite");
                const songsStore = songsTx.objectStore("songs");
                songsStore.put(songToSave);
                songsInIndexedDB.set(await getSongIdsInIndexedDB());
            });
        }
    });

    // fetch(`/api/image/${song.image}`).then((response) => {
    //     if (response.ok) {
    //         response.blob().then()=>{}

    //     }
    // });

    // const imageBlob = await fetch(`/api/image/${song.image}`).then((response) =>
    //     response.blob()
    // );

    // const imageToSave = {
    //     id: song.image,
    //     blob: imageBlob,
    // };

    // console.log("imageToSave", imageToSave);

    // const imagesTx = database.transaction("images", "readwrite");
    // const imagesStore = imagesTx.objectStore("images");
    // imagesStore.put(imageToSave);
}

export async function getSongInIndexedDB(
    id: string
): Promise<
    SongDBWithBlob<"id" | "name" | "blob" | "artists" | "images" | "duration">
> {
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
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.register(
                "/service-worker.js",
                {
                    scope: "/",
                }
            );
            if (registration.installing) {
                console.log("Service worker installing");
            } else if (registration.waiting) {
                console.log("Service worker installed");
            } else if (registration.active) {
                console.log("Service worker active");
            }
        } catch (error) {
            console.error(`Registration failed with ${error}`);
        }
    }
}

// *************************
// **** Event listeners ****
// *************************

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

//   ## Remove this part to make the next/prev song controls instead of seek ##
//
//navigator.mediaSession.setActionHandler("seekforward", async () => {
//    console.log("seekforward");
//});
//
//navigator.mediaSession.setActionHandler("seekbackward", async () => {
//    console.log("seekbackward");
//});
//      ## Unused ##
//navigator.mediaSession.setActionHandler("skipad", async () => {
//    console.log("skipad");
//});

audio.addEventListener("canplay", () => {
    if ("mediaSession" in navigator && !isNaN(audio.duration)) {
        navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: 1.0,
            position: audio.currentTime,
        });
    }
});

audio.addEventListener("timeupdate", () => {
    currentTime.set(audio.currentTime);
    send({ currentTime: audio.currentTime });

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

            send({ songEnded: songId });
        }
    }

    if ("mediaSession" in navigator) {
        // Asegúrate de que audio.duration no sea NaN
        if (!isNaN(audio.duration)) {
            navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: 1.0,
                position: audio.currentTime,
            });
        }
    }
});

audio.addEventListener("play", () => {
    playing.set(true);
    if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
    }
});

audio.addEventListener("pause", () => {
    playing.set(false);
    if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
    }
});

audio.addEventListener("ended", async () => {
    await next();
    play();

    const nextSong = currentSong.get(); // La nueva canción que será reproducida
    if ("mediaSession" in navigator && nextSong) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: nextSong.name,
            artist: nextSong.artists.map((artist) => artist.name).join(", "),
            album: nextSong.albumName,
            artwork: [
                {
                    src: `/api/image/${nextSong.image}`, // Asegúrate de usar la URL correcta de la imagen
                    sizes: "96x96",
                    type: "image/png",
                },
                // Asegúrate de definir más tamaños de imagen si es necesario
            ],
        });
    }
});

audio.addEventListener("error", (event) => {
    console.error("Error loading audio", event);
});
