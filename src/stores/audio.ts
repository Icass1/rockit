import { atom } from 'nanostores';
import type { songDB } from "@/types/types"

const currentSong = atom<songDB | undefined>(undefined);
const playing = atom<boolean>(false);
const currentTime = atom<number | undefined>(undefined);
const totalTime = atom<number | undefined>(undefined);

const audio = new Audio()

currentSong.subscribe((value) => {
    if (value) {
        playing.set(false)
        audio.src = `/api/song/${value.id}`
    }
})

const play = () => {
    audio.play().then(data => { })
}

const pause = () => {
    audio.pause()
}

function getTime(seconds: number) {
    seconds = Math.round(seconds);

    if (typeof seconds !== "number" || isNaN(seconds)) {
        return "Invalid input";
    }

    // Calculate minutes and remaining seconds
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    // Format the result with leading zeros
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(remainingSeconds).padStart(2, "0");

    return `${formattedMinutes}:${formattedSeconds}`;
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

export { currentSong, play, pause, playing, currentTime, totalTime, getTime }