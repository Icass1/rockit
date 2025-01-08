import { atom } from "nanostores";
import type { SongDB, UserDB } from "@/lib/db";

let websocket: WebSocket;

function startSocket() {
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

startSocket();

export type QueueSong = SongDB<
    "id" | "name" | "artists" | "images" | "duration"
>;

type Queue = {
    song: QueueSong;
    list: { type: string; id: string } | undefined;
}[];
type CurrentSong =
    | SongDB<"images" | "id" | "name" | "artists" | "albumId" | "albumName">
    | undefined;

const userJsonResponse = await fetch(
    "/api/user?q=currentSong,currentTime,queue,queueIndex,volume"
);
let userJson;
if (userJsonResponse.ok) {
    userJson = (await userJsonResponse.json()) as UserDB<
        "currentSong" | "currentTime" | "queue" | "queueIndex" | "volume"
    >;
}

let _currentSong = undefined;
let _queue: Queue = [];
let _queueIndex = userJson?.queueIndex ?? 0;

try {
    if (userJson?.currentSong) {
        _currentSong = (await (
            await fetch(
                `/api/song/${userJson.currentSong}?q=images,id,name,artists,albumId,albumName`
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

    _queue = _queueJson.map((song, index) => {
        return { song: song, list: userJson.queue[index].list };
    });
}

const send = (json: any) => {
    if (websocket.OPEN == websocket.readyState) {
        websocket.send(JSON.stringify(json));
    }
};

export const currentSong = atom<CurrentSong>(_currentSong);
export const playing = atom<boolean>(false);
export const currentTime = atom<number | undefined>(undefined);
export const totalTime = atom<number | undefined>(undefined);
export const queue = atom<Queue>(_queue);
export const queueIndex = atom<number | undefined>(_queueIndex);
// console.log(window.innerWidth < 768 ? 1 : (userJson?.volume ?? 1));
export const volume = atom<number>(
    window.innerWidth < 768 ? 1 : (userJson?.volume ?? 1)
);

const audio = new Audio(
    _currentSong?.id ? `/api/song/audio/${_currentSong?.id}` : undefined
);

if (userJson?.currentTime) {
    audio.currentTime = userJson.currentTime;
}

currentSong.subscribe((value) => {
    send({ currentSong: value?.id });

    if ("mediaSession" in navigator && value) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: value.name,
            artist: value.artists.map((artist) => artist.name).join(", "),
            album: value.albumName,
            artwork: [
                {
                    src: `${value.images[0].url}`, // Repalce value.images[0].url for value.image
                    sizes: "96x96",
                    type: "image/png",
                },
                {
                    src: `${value.images[0].url}`,
                    sizes: "128x128",
                    type: "image/png",
                },
                {
                    src: `${value.images[0].url}`,
                    sizes: "192x192",
                    type: "image/png",
                },
                {
                    src: `${value.images[0].url}`,
                    sizes: "256x256",
                    type: "image/png",
                },
                {
                    src: `${value.images[0].url}`,
                    sizes: "384x384",
                    type: "image/png",
                },
                {
                    src: `${value.images[0].url}`,
                    sizes: "512x512",
                    type: "image/png",
                },
            ],
        });
    }

    if (value) {
        playing.set(false);
        audio.src = `/api/song/audio/${value.id}`;
    }
});

queue.subscribe((value) => {
    send({
        queue: value
            .map((value) => {
                if (value?.song && value?.list) {
                    return { song: value.song.id, list: value.list };
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

export const play = async () => {
    await audio.play();
};

export const pause = () => {
    audio.pause();
};

export function setTime(time: number) {
    audio.currentTime = time;
}

export async function next() {
    if (!queueIndex.get() && queueIndex.get() != 0) {
        return;
    }
    queueIndex.set((queueIndex.get() as number) + 1);
    await fetch(`/api/song/${queue.get()[queueIndex.get() as number].song.id}`)
        .then((response) => response.json())
        .then((data: SongDB) => {
            currentSong.set(data);
        });
}

navigator.mediaSession.setActionHandler("play", async () => {
    play();
});

navigator.mediaSession.setActionHandler("pause", async () => {
    pause();
});

navigator.mediaSession.setActionHandler("previoustrack", () => {
    // TODO
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
    const currentSongId = currentSong?.get()?.id;
    if (currentSongId) {
        send({ songEnded: currentSongId });
    }
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
                    src: `${nextSong.images[0].url}`, // Asegúrate de usar la URL correcta de la imagen
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
