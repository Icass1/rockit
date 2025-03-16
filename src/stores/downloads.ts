import { atom } from "nanostores";
export let data: string[] = [];

export const downloads = atom<string[]>(data);

fetch("/api/downloads")
    .then((response) => {
        if (response.ok) {
            response.json().then((data) => downloads.set(data));
        }
    })
    .catch(() => downloads.set([]));
