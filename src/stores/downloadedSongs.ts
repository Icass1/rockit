import { atom } from "nanostores";
import { data } from "./downloads";

// Songs that have been added to server database during this season
export const downloadedSongs = atom<string[]>(data);
