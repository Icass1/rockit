import type { SongDB, SongDBFull } from "@/lib/db/song";
import type { UserDB } from "@/lib/db/user";
import type { Message } from "@/pages/ws";
import Hls from "hls.js";
import { atom } from "nanostores";

let websocket: WebSocket;

let database: IDBDatabase;

openIndexedDB().then((_database) => {
    database = _database;
    getSongIdsInIndexedDB().then((data) => {
        songsInIndexedDB.set(data);
    });
});

startSocket();
registerServiceWorker();

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

let _queue: Queue = [];

const send = (json: any) => {
    if (websocket && websocket.OPEN == websocket.readyState) {
        websocket.send(JSON.stringify(json));
    }
};

export const currentSong = atom<CurrentSong | undefined>(undefined);
export const playing = atom<boolean>(false);
export const loading = atom<boolean>(false);
export const playWhenReady = atom<boolean>(false);
export const currentTime = atom<number | undefined>(undefined);
export const totalTime = atom<number | undefined>(undefined);
export const queue = atom<Queue>(_queue);
export const queueIndex = atom<number | undefined>(undefined);
export const volume = atom<number | undefined>();
export const randomQueue = atom<boolean | undefined>(undefined);
export const repeatSong = atom<boolean | undefined>(undefined);
export const currentStation = atom<Station | undefined>(undefined);
export const songsInIndexedDB = atom<string[] | undefined>(undefined);
export const serviceWorkerRegistration = atom<
    ServiceWorkerRegistration | undefined
>(undefined);

let audio = new Audio();
let audio2 = new Audio();
const hls = new Hls();

let songCounted = false;
let lastTime: number | undefined = undefined;
let timeSum = 0;
let inCrossFade = false;
const crossFade = Number(localStorage.getItem("crossFade")) ?? 0;

fetch(
    "/api/user?q=currentSong,currentTime,queue,queueIndex,volume,randomQueue,repeatSong,currentStation"
).then((userJsonResponse) => {
    if (userJsonResponse.ok) {
        userJsonResponse
            .json()
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
                    >
                ) => {
                    queueIndex.set(userJson.queueIndex);
                    if (userJson?.currentTime) {
                        audio.currentTime = userJson.currentTime;
                    }

                    repeatSong.set(userJson.repeatSong == "1" ? true : false);
                    randomQueue.set(userJson.randomQueue == "1" ? true : false);

                    volume.set(
                        window.innerWidth < 768 ? 1 : (userJson?.volume ?? 1)
                    );

                    if (userJson.currentSong) {
                        fetch(
                            `/api/song/${userJson.currentSong}?q=image,id,name,artists,albumId,albumName,duration`
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
                                if (data && data[0])
                                    currentStation.set(data[0]);
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
                                                    (song) =>
                                                        song.id ==
                                                        queueSong.song
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
                                        .filter(
                                            (song) => typeof song != "undefined"
                                        )
                                );
                            })
                        );
                    }
                }
            );
    }
});

// *****************************
// **** Store subscriptions ****
// *****************************

randomQueue.subscribe((value) => {
    send({ randomQueue: value ? "1" : "0" });
});

repeatSong.subscribe((value) => {
    send({ repeatSong: value ? "1" : "0" });
});

currentSong.subscribe(async (value) => {
    send({ currentSong: value?.id || "" });

    // if (value?.id) {
    //     // Just to fill quickly last listened songs for developing propourses
    //     console.log("song ended");
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
    console.log("inCrossFade", inCrossFade);
    console.log("audio2.paused", audio2.paused);
    if (inCrossFade && !audio2.paused) {
        console.log("audio", audio);
        console.log("audio2", audio2);
        [audio, audio2] = [audio2, audio];
        addAudioEventListeners(audio);
        audio2 = new Audio();
        inCrossFade = false;
    } else if (value) {
        loading.set(true);
        playing.set(false);
        audio2.pause();
        audio2 = new Audio();
        audio.src = await getSongSrc(value.id);
        audio.onerror = () => {
            loading.set(false);
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

    console.log(value.url_resolved);

    if (value.url_resolved) {
        const isHls = await isHlsContent(value.url_resolved);
        if (Hls.isSupported() && isHls) {
            console.log("Hls");
            hls.loadSource(value.url_resolved);
            hls.attachMedia(audio);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                audio
                    .play()
                    .catch((err) => console.error("Error playing audio:", err));
            });
        } else {
            console.log("not Hls");
            audio.src = value.url_resolved;
            // audio.play();
            audio.onloadeddata = () => {
                console.log("onloadeddata");
                audio.play();
            };
            audio.oncanplay = () => {
                console.log("oncanplay");
                audio.play();
            };
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
    if (window.innerWidth < 768) return;
    if (!value) return;
    audio.volume = value;
    send({ volume: value });
});

// **************************
// **** Helper functions ****
// **************************

async function isHlsContent(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

    try {
        console.log("1111111111111111111111");
        const response = await fetch(url, {
            method: "GET",
            headers: { Range: "bytes=0-512" },
            signal: controller.signal,
        });
        console.log("222222222222222");

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
    await audio.play();
}

export function pause() {
    audio.pause();
}

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
        console.log("Web socket message", event.data);
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
        .then((data) => {
            if (songEnded) {
                inCrossFade = true;
                playWhenReady.set(false);
            } else {
                inCrossFade = false;
                playWhenReady.set(true);
            }
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
            serviceWorkerRegistration.set(registration);

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

async function getSongSrc(songID: string) {
    if (songsInIndexedDB.get()?.includes(songID)) {
        const song = await getSongInIndexedDB(songID);
        const audioURL = URL.createObjectURL(song.blob);
        return audioURL;
    } else {
        return `/api/song/audio/${songID}`;
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

const addAudioEventListeners = (audio: HTMLAudioElement) => {
    if (!audio.paused) {
        playing.set(true);
    }
    audio.addEventListener("canplay", () => {
        if ("mediaSession" in navigator && !isNaN(audio.duration)) {
            navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: 1,
                position: audio.currentTime,
            });
        }
    });
    let initAudio = false;
    audio.addEventListener("timeupdate", async () => {
        currentTime.set(audio.currentTime);
        send({
            currentTime: audio.currentTime,
        });
        const userVolume = volume.get();
        if (userVolume) {
            if (audio.duration - audio.currentTime < crossFade) {
                audio.volume =
                    (-userVolume / crossFade) *
                    (audio.currentTime - audio.duration);
                if (
                    Math.abs(
                        audio.currentTime -
                            (audio.duration - crossFade) -
                            audio2.currentTime
                    ) > 1 &&
                    initAudio &&
                    !audio2.paused &&
                    !audio2.paused
                ) {
                    console.log("audio2.currentTime = audio.currentTime");
                    console.log("audio2.currentTime", audio2.currentTime);
                    console.log("audio.currentTime", audio.currentTime);
                    audio2.currentTime =
                        audio.currentTime - (audio.duration - crossFade);
                }
                if (!initAudio && !audio.paused) {
                    initAudio = true;
                    console.log("Init audio 2");
                    const currentSongIndexInQueue = queue
                        .get()
                        .findIndex((song) => song.index == queueIndex.get());
                    console.log(
                        "currentSongIndexInQueue",
                        currentSongIndexInQueue
                    );
                    audio2.src = await getSongSrc(
                        queue.get()[currentSongIndexInQueue + 1].song.id
                    );
                    audio2.play();
                }
                audio2.volume =
                    (userVolume / crossFade) *
                        (audio.currentTime - audio.duration) +
                    userVolume;
            } else {
                audio.volume = userVolume;
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
                artist: nextSong.artists
                    .map((artist) => artist.name)
                    .join(", "),
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
    });
    audio.addEventListener("error", (event) => {
        console.error("Error loading audio", event);
    });
};
addAudioEventListeners(audio);
