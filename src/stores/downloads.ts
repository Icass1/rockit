import { atom } from "nanostores";

const data = await (await fetch("/api/downloads")).json();

export const downloads = atom<string[]>(data);
