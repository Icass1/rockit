import { atom } from "nanostores";

export type Device = { deviceName: string; you: boolean; audioPlayer: boolean };

export const devices = atom<Device[]>([]);
