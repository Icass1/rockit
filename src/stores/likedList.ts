import { atom } from "nanostores";

export const likedSongs = atom<string[]>([]);

fetch("/api/user/liked-songs").then((response) => {
    if (response.ok) {
        response.json().then((data) => {
            likedSongs.set(data);
        });
    }
});