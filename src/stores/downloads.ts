import { atom } from "nanostores";
let data: string[] = [];

export const downloads = atom<string[]>(data);

fetch("/api/downloads").then((response) => {
    if (response.ok) {
        response.json().then((data) => downloads.set(data));
    }
});
