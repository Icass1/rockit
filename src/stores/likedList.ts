import { atom } from "nanostores";

export const likedSongs = atom<string[]>([]);

fetch("/api/user/liked-songs")
    .then((response) =>
        response.json().then((data) => {
            likedSongs.set(data);
        })
    )
    .catch(() => likedSongs.set([]));
