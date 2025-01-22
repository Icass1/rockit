import { atom } from "nanostores";

const isPlayerUIVisible = atom<boolean>(false);
const isMobilePlayerUIVisible = atom<boolean>(false);
export { isPlayerUIVisible, isMobilePlayerUIVisible };
