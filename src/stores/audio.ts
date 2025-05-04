import type { SongDB, SongDBFull } from "@/lib/db/song";
import { type UserDB } from "@/lib/db/user";
import Hls from "hls.js";
import { atom } from "nanostores";
import { lang } from "./lang";
import { openRockItIndexedDB } from "@/lib/indexedDB";
import { getSession } from "next-auth/react";
import { Device, devices } from "./devices";
import { users } from "./users";

// Track user interaction state for iOS autoplay handling
let audioContext: AudioContext | undefined;

// Function to detect iOS devices
const isIOS = (): boolean => {
    if (typeof window === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

let websocket: WebSocket;

export let database: IDBDatabase | undefined;

type Primitive = boolean | number | string;

export type ReadonlyIfObject<Value> = Value extends undefined
    ? Value
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Value extends (...args: any) => any
      ? Value
      : Value extends Primitive
        ? Value
        : Value extends object
          ? Readonly<Value>
          : Value;

type MyAtomWrapper<T> = {
    get(): T;
    set(value: T, sendToSocket?: boolean): void;
    subscribe(callback: (value: T) => void): () => void;
    listen(
        listener: (
            value: ReadonlyIfObject<T>,
            oldValue: ReadonlyIfObject<T>
        ) => void
    ): () => void;
    notify(oldValue?: ReadonlyIfObject<T>): void;
    off(): void;
    lc: number;
    value: T;
};

// The wrapper function
export function createControlledAtom<T>(
    initialValue: T,
    name: string
): MyAtomWrapper<T>;
export function createControlledAtom<T>(
    initialValue: T,
    name: string,
    getMessageToSend: (value: T) => object | undefined | string | number,
    getValueFromMessage: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ((value: any) => Promise<T | undefined>)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        | ((value: any) => T | undefined)
): MyAtomWrapper<T>;
export function createControlledAtom<T>(
    initialValue: T,
    name: string,
    getMessageToSend?: (value: T) => object | undefined | string | number,
    getValueFromMessage?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | ((value: any) => Promise<T | undefined>)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        | ((value: any) => T | undefined)
): MyAtomWrapper<T> {
    const baseAtom = atom<T>(initialValue);
    const listenerAdded = atom<boolean>(false);

    const addSocketListener = () => {
        if (
            websocket &&
            websocket.OPEN == websocket.readyState &&
            !listenerAdded.get()
        ) {
            websocket.addEventListener("message", async (message) => {
                try {
                    const messageJson = JSON.parse(message.data);
                    if (typeof messageJson[name] == "undefined") return;
                    if (getValueFromMessage) {
                        const value = await getValueFromMessage(
                            messageJson[name]
                        );
                        if (typeof value == "undefined") return;
                        baseAtom.set(value);
                    } else {
                        baseAtom.set(messageJson[name]);
                    }
                } catch {}
            });
            listenerAdded.set(true);
        }
    };

    return {
        get() {
            addSocketListener();
            return baseAtom.get();
        },
        set(value: T, sendToSocket = true) {
            addSocketListener();

            if (sendToSocket && websocket) {
                if (getMessageToSend) {
                    const valueToSend = getMessageToSend(value);
                    if (websocket.readyState == websocket.OPEN)
                        websocket.send(JSON.stringify({ [name]: valueToSend }));
                } else {
                    if (websocket.readyState == websocket.OPEN)
                        websocket.send(JSON.stringify({ [name]: value }));
                }
            }

            baseAtom.set(value);
        },
        subscribe(callback) {
            addSocketListener();

            return baseAtom.subscribe(callback);
        },
        listen(
            listener: (
                value: ReadonlyIfObject<T>,
                oldValue: ReadonlyIfObject<T>
            ) => void
        ) {
            addSocketListener();

            return baseAtom.listen(listener);
        },
        notify(oldValue) {
            addSocketListener();

            return baseAtom.notify(oldValue);
        },
        off() {
            return baseAtom.off();
        },
        lc: baseAtom.lc,
        value: baseAtom.value,
    };
}

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

    // Set up event listeners to track user interactions for iOS autoplay
    const interactionEvents = ["touchstart", "mousedown", "keydown"];
    interactionEvents.forEach((event) => {
        window.addEventListener(
            event,
            () => {
                // Initialize AudioContext on user interaction for iOS
                if (!audioContext && window.AudioContext) {
                    audioContext = new AudioContext();
                }
            },
            { once: false, passive: true }
        );
    });
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

export const send = (json: object) => {
    if (websocket && websocket.OPEN == websocket.readyState) {
        console.warn("export const send", json);

        websocket.send(JSON.stringify(json));
    } else {
        if (admin.get())
            console.warn("Socket is not ready to send message", json);
    }
};

export const currentSong = createControlledAtom<CurrentSong | undefined>(
    undefined,
    "currentSong",
    (currentSong: CurrentSong) => currentSong?.id,
    async (songId) => {
        const response = await fetch(
            `/api/song/${songId}?q=image,id,name,artists,albumId,albumName,duration,path`
        );

        return (await response.json()) as CurrentSong;
    }
);
export const playing = createControlledAtom<boolean>(false, "playing");
export const loading = atom<boolean>(false);
export const playWhenReady = atom<boolean>(false);
export const currentTime = createControlledAtom<number | undefined>(
    undefined,
    "currentTime"
);
export const totalTime = atom<number | undefined>(undefined);

export const queue = createControlledAtom<Queue | undefined>(
    _queue,
    "queue",
    (queue: Queue | undefined) =>
        queue
            ?.map((value) => {
                if (value?.song && value?.list) {
                    return {
                        song: value.song.id,
                        index: value.index,
                        list: value.list,
                    };
                }
            })
            .filter((song) => song),
    async (queue: UserDB["queue"]) => {
        const response = await fetch(
            `/api/songs1?songs=${queue
                .map((queueSong) => queueSong.song)
                .join()}&p=id,name,artists,images,duration`
        );

        const json = (await response.json()) as SongDB<
            "id" | "name" | "artists" | "image" | "duration"
        >[];

        return queue
            .map((queueSong) => {
                const songInfo = json
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
            .filter((song) => typeof song != "undefined") as Queue;
    }
);
export const queueIndex = createControlledAtom<number | undefined>(
    undefined,
    "queueIndex"
);
export const volume = createControlledAtom<number | undefined>(
    undefined,
    "volume"
);
export const randomQueue = createControlledAtom<boolean | undefined>(
    undefined,
    "randomQueue",
    (value) => (value ? "1" : "0"),
    (value) => (value == "1" ? true : false)
);
export const repeatSong = createControlledAtom<boolean | undefined>(
    undefined,
    "repeatSong",
    (value) => (value ? "1" : "0"),
    (value) => (value == "1" ? true : false)
);
export const currentStation = createControlledAtom<Station | undefined>(
    undefined,
    "currentStation",
    (station: Station | undefined) => station?.stationuuid,
    async (stationuuid) => {
        const response = await fetch(
            `/api/radio/stations/byuuid/${stationuuid}`
        );

        const data = await response.json();

        if (data && data[0]) {
            return data[0] as Station;
        }
    }
);

export const songsInIndexedDB = atom<string[] | undefined>(undefined);
export const serviceWorkerRegistration = atom<
    ServiceWorkerRegistration | undefined
>(undefined);

export const admin = atom<boolean | undefined>(undefined);

let audioPlayer: boolean = false;

let audio: HTMLAudioElement | undefined;
let audio2: HTMLAudioElement | undefined;
const hls = new Hls();

let songCounted = false;
let lastTime: number | undefined = undefined;
let timeSum = 0;
let inCrossFade = false;

export const crossFade = createControlledAtom<number | undefined>(
    0,
    "crossFade"
);

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

            queueIndex.set(userJson.queueIndex, false);
            if (userJson?.currentTime) {
                audio.currentTime = userJson.currentTime;
            }

            admin.set(userJson.admin);

            repeatSong.set(userJson.repeatSong, false);
            randomQueue.set(userJson.randomQueue, false);

            volume.set(
                window.innerWidth < 768 ? 1 : (userJson?.volume ?? 1),
                false
            );

            if (userJson.currentSong) {
                fetch(
                    `/api/song/${userJson.currentSong}?q=image,id,name,artists,albumId,albumName,duration,path`
                ).then((response) =>
                    response.json().then((data: CurrentSong) => {
                        currentSong.set(data, false);
                    })
                );
            }

            if (userJson.currentStation) {
                fetch(
                    `/api/radio/stations/byuuid/${userJson.currentStation}`
                ).then((response) =>
                    response.json().then((data) => {
                        console.warn("currentStation.set", data[0]);
                        if (data && data[0]) currentStation.set(data[0], false);
                    })
                );
            }

            if (userJson && userJson.queue.length > 0) {
                fetch(
                    `/api/songs1?songs=${userJson.queue
                        .map((queueSong) => queueSong.song)
                        .join()}&p=id,name,artists,images,duration`
                ).then((response) => {
                    if (response.ok) {
                        response.json().then((queueSongs: QueueSong[]) => {
                            queue.set(
                                userJson.queue
                                    .map((queueSong) => {
                                        const songInfo = queueSongs
                                            .filter((song) => song)
                                            .find(
                                                (song) =>
                                                    song.id == queueSong.song
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
                                    ),
                                false
                            );

                            addSubscribers();
                        });
                    } else {
                        console.error("Error getting songs info");
                        queue.set([], false);
                        addSubscribers();
                    }
                });
            } else {
                queue.set([], false);
                addSubscribers();
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
            addSubscribers();
        };

        userQuery.onerror = () => {
            repeatSong.set(false);
            randomQueue.set(false);
            volume.set(1);

            queue.set([]);
        };

        admin.set(false);
        addSubscribers();
    });

// *****************************
// **** Store subscriptions ****
// *****************************

function addSubscribers() {
    console.log("addSubscribers");
    randomQueue.subscribe(() => {
        if (typeof window === "undefined") return;

        updateUserIndexedDB();
    });

    repeatSong.subscribe(() => {
        if (typeof window === "undefined") return;

        updateUserIndexedDB();
    });

    const playWhenLoaded = () => {
        initAudio();

        if (!audio) {
            console.error("audio is undefined");
            return;
        }

        if (admin.get()) console.log("playWhenLoaded");
        if (admin.get())
            console.log("playWhenReady.get()", playWhenReady.get());
        if (admin.get()) console.log("6");
        loading.set(false);

        if (!audioPlayer) return;

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

        currentStation.set(undefined);

        updateUserIndexedDB();

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
                        .catch((err) =>
                            console.error("Error playing audio:", err)
                        );
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
    });

    queueIndex.subscribe(() => {
        if (typeof window === "undefined") return;

        updateUserIndexedDB();
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
    });
}

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

    // Resume AudioContext if it exists and is suspended (iOS requirement)
    if (audioContext && audioContext.state === "suspended") {
        await audioContext.resume();
    }

    if (admin.get())
        console.log(
            "export async function play",
            audioPlayer,
            audio.readyState,
            audio2.readyState
        );

    if (audioPlayer) {
        try {
            await audio.play();
            if (audio2.readyState != 0) {
                await audio2.play();
            }
        } catch (error) {
            console.error("Error playing audio:", error);
            // If play() fails, it's likely due to autoplay restrictions
            // We'll show a message to the user that they need to interact with the page
            if (isIOS()) {
                console.warn(
                    "iOS requires user interaction to play audio. Tap anywhere to enable playback."
                );
            }
        }
    } else {
        send({ command: "play" });
    }
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

    if (admin.get()) console.log("pause", audioPlayer);
    audio.pause();
    audio2.pause();

    if (!audioPlayer) {
        send({ command: "pause" });
    }
}

export function setTime(time: number) {
    initAudio();

    if (!audio) {
        console.error("audio is undefined");
        return;
    }

    audio.currentTime = time;
}

export function clearCurrentSong() {
    currentSong.set(undefined);
    queue.set([]);
    currentTime.set(0);
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
async function startSocket() {
    if (typeof window === "undefined") return null;

    const session = await getSession();

    if (!session) return;

    if (!window.navigator.onLine) return;
    if (location.protocol == "https:") {
        websocket = new WebSocket(`wss://${location.hostname}/ws`);
    } else {
        websocket = new WebSocket(`ws://${location.hostname}:3001/ws`);
    }

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.message == "validated") {
            send({
                deviceName: getUA(),
            });
        } else if (data.command == "play" && audioPlayer) {
            play();
        } else if (data.command == "pause" && audioPlayer) {
            pause();
        } else if (data.usersCount) {
            users.set(data.usersCount);
        } else if (data.devices) {
            let player = false;

            data.devices.forEach((device: Device) => {
                if (device.you && device.audioPlayer) {
                    player = true;
                }
            });

            if (audioPlayer && !player) {
                audioPlayer = true;
                pause();
                audioPlayer = false;
            }

            if (!audioPlayer && player && playing.get()) {
                audioPlayer = player;
                play();
                playing.set(true);
            }

            audioPlayer = player;

            devices.set(data.devices);
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
    if (!id) return;

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
        const version = 2;

        try {
            const updatedServiceWorker = localStorage.getItem(
                "updatedServiceWorker"
            );

            if (
                !updatedServiceWorker ||
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
    if (currentStation.get() && !currentSong.get()) return;

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
