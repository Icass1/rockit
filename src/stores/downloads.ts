import { atom } from "nanostores";
export let data: string[] = [];

export const downloads = atom<string[]>(data);

fetch("/api/downloads")
    .then((response) => response.json().then((data) => downloads.set(data)))
    .catch(() => downloads.set([]));
