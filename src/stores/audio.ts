import { atom } from 'nanostores';
import type { SongDB } from "@/lib/db"

export const currentSong = atom<SongDB<"images" | "id" | "name" | "artists" | "albumId" | "albumName"> | undefined>(undefined);
export const playing = atom<boolean>(false);
export const currentTime = atom<number | undefined>(undefined);
export const totalTime = atom<number | undefined>(undefined);
export const queue = atom<SongDB<"id" | "name" | "artists" | "images" | "duration">[]>([]);
export const queueIndex = atom<number | undefined>(undefined);

const audio = new Audio()

currentSong.subscribe((value) => {
    if (value) {
        playing.set(false)
        audio.src = `/api/song/audio/${value.id}`
    }
})

export const play = async () => {
    await audio.play()
}

export const pause = () => {
    audio.pause()
}

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
    audio.currentTime = time
}

export async function next() {
    if (!queueIndex.get() && queueIndex.get() != 0) { return }
    queueIndex.set(queueIndex.get() as number + 1)
    await fetch(`/api/song/${queue.get()[queueIndex.get() as number].id}`).then(response => response.json()).then((data: SongDB) => {
        currentSong.set(data)
    })
}

audio.addEventListener("canplay", () => {
    totalTime.set(audio.duration)
})

audio.addEventListener("timeupdate", () => {
    currentTime.set(audio.currentTime)
})

audio.addEventListener("play", () => {
    playing.set(true)
})

audio.addEventListener("pause", () => {
    playing.set(false)
})

audio.addEventListener("ended", async () => {
    await next()
    play()
})