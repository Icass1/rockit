import { atom } from "nanostores";
import type { SongDB, UserDB } from "@/lib/db";

let websocket: WebSocket;

if (location.protocol == "https:") {
    websocket = new WebSocket(`wss://${location.host}/ws`);
} else {
    websocket = new WebSocket(`ws://${location.host}/ws`);
}

websocket.onopen = (event) => {
    console.log("Web socket open");
};
websocket.onmessage = (event) => {
    console.log("Web socket message", event.data);
};
websocket.onclose = (event) => {
    console.log("Web socket close");
};

type Queue = SongDB<"id" | "name" | "artists" | "images" | "duration">[];
type CurrentSong =
    | SongDB<"images" | "id" | "name" | "artists" | "albumId" | "albumName">
    | undefined;

const json = (await (
    await fetch("/api/user?q=currentSong,currentTime,queue,queueIndex")
).json()) as UserDB<"currentSong" | "currentTime" | "queue" | "queueIndex">;

let _currentSong = undefined;
let _queue: Queue = [];
let _queueIndex = json.queueIndex || 0;

if (json.currentSong) {
    _currentSong = (await (
        await fetch(
            `/api/song/${json.currentSong}?q=images,id,name,artists,albumId,albumName`
        )
    ).json()) as CurrentSong;
}

if (json.queue.length > 0) {
    _queue = (await (
        await fetch(
            `/api/songs?songs=${json.queue.join()}&p=id,name,artists,images,duration`
        )
    ).json()) as Queue;
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

const audio = new Audio(
    _currentSong?.id ? `/api/song/audio/${_currentSong?.id}` : undefined
);

if (json.currentTime) {
    audio.currentTime = json.currentTime;
}

currentSong.subscribe((value) => {
    send({ currentSong: currentSong.get()?.id });
    if (value) {
        playing.set(false);
        audio.src = `/api/song/audio/${value.id}`;
    }
});

queue.subscribe((value) => {
    send({ queue: value.map((value) => value.id) });
});

queueIndex.subscribe((value) => {
    send({ queueIndex: value });
});

export const play = async () => {
    await audio.play();
};

export const pause = () => {
    audio.pause();
};

export function getTime(seconds: number) {
    seconds = Math.round(seconds);

    if (typeof seconds !== "number" || isNaN(seconds)) {
        return "Invalid input";
    }

    // Calculate minutes and remaining seconds
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    // Format the result with leading zeros
    const formattedMinutes = String(minutes).padStart(1, "0");
    const formattedSeconds = String(remainingSeconds).padStart(2, "0");

    return `${formattedMinutes}:${formattedSeconds}`;
}

export function setTime(time: number) {
    audio.currentTime = time;
}

export async function next() {
    if (!queueIndex.get() && queueIndex.get() != 0) {
        return;
    }
    queueIndex.set((queueIndex.get() as number) + 1);
    await fetch(`/api/song/${queue.get()[queueIndex.get() as number].id}`)
        .then((response) => response.json())
        .then((data: SongDB) => {
            currentSong.set(data);
        });
}

audio.addEventListener("canplay", () => {
    totalTime.set(audio.duration);
});

audio.addEventListener("timeupdate", () => {
    currentTime.set(audio.currentTime);
    send({ currentTime: audio.currentTime });
});

audio.addEventListener("play", () => {
    playing.set(true);
});

audio.addEventListener("pause", () => {
    playing.set(false);
});

audio.addEventListener("ended", async () => {
    const currentSongId = currentSong?.get()?.id;
    if (currentSongId) {
        send({ songEnded: currentSongId });
    }
    await next();
    play();
});
