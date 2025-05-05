// ****************************************
// ************** User stuff **************
// ****************************************

import type { PlaylistDBSong } from "./playlist";

export interface RawUserDB {
    id: string;
    username: string;
    passwordHash: string;
    lists: string;
    lastPlayedSong: string | undefined;
    currentSong: string | undefined;
    currentStation: string | undefined;
    currentTime: number | undefined;
    queue: string;
    queueIndex: number | undefined;
    randomQueue: string;
    repeatSong: "one" | "off" | "all";
    likedSongs: string;
    pinnedLists: string;
    volume: number;
    crossFade: number;
    lang: string;
    admin: string;
    superAdmin: string;
    impersonateId: string | undefined;
    devUser: string;
    updatedAt: number;
    createdAt: number;
}

export interface UserDBPinnedLists {
    type: string;
    createdAt: number;
    id: string;
}

export interface UserDBList {
    type: string;
    createdAt: number;
    id: string;
}

export type UserDB<Keys extends keyof UserDBFull = keyof UserDBFull> = Pick<
    UserDBFull,
    Keys
>;
export interface UserDBFull {
    id: string;
    username: string;
    passwordHash: string;
    lists: UserDBList[];
    lastPlayedSong: {
        [key: string]: (number | string)[];
    };
    currentSong: string | undefined;
    currentStation: string | undefined;
    currentTime: number | undefined;
    queue: {
        song: string;
        list: { type: string; id: string } | undefined;
        index: number;
    }[];
    queueIndex: number | undefined;
    randomQueue: boolean;
    repeatSong: "one" | "off" | "all";
    likedSongs: PlaylistDBSong[];
    pinnedLists: UserDBPinnedLists[];
    volume: number;
    crossFade: number;
    lang: string;
    admin: boolean;
    superAdmin: boolean;
    impersonateId: string | undefined;
    devUser: boolean;
    updatedAt: number;
    createdAt: number;
}

export const userQuery = `CREATE TABLE IF NOT EXISTS user (
    id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL UNIQUE,
    lists TEXT DEFAULT "[]" NOT NULL,
    lastPlayedSong TEXT,
    currentSong TEXT,
    currentStation TEXT,
    currentTime INTEGER,
    queue TEXT DEFAULT "[]" NOT NULL,
    queueIndex INTEGER,
    randomQueue BOOLEAN DEFAULT 0 NOT NULL,
    repeatSong TEXT DEFAULT "off" NOT NULL,
    likedSongs TEXT DEFAULT "[]" NOT NULL,
    pinnedLists TEXT DEFAULT "[]" NOT NULL,
    volume INTEGER DEFAULT 1 NOT NULL,
    crossFade INTEGER DEFAULT 0 NOT NULL,
    lang TEXT DEFAULT "en" NOT NULL,
    admin BOOLEAN DEFAULT 0 NOT NULL,
    superAdmin BOOLEAN DEFAULT 0 NOT NULL,
    impersonateId TEXT,
    devUser BOOLEAN DEFAULT 0 NOT NULL,
    updatedAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL
)`;

export function parseUser(user: RawUserDB | undefined): UserDB | undefined {
    if (!user) {
        return undefined;
    }

    return {
        id: user.id,
        username: user.username,
        passwordHash: user.passwordHash,
        lists: JSON.parse(user.lists || "[]"),
        lastPlayedSong: user.lastPlayedSong
            ? JSON.parse(user.lastPlayedSong || "[]")
            : undefined,
        currentSong: user.currentSong,
        currentStation: user.currentStation,
        currentTime: user.currentTime,
        queue: JSON.parse(user.queue || "[]"),
        queueIndex: user.queueIndex,
        randomQueue: user.randomQueue == "1" ? true : false,
        repeatSong: user.repeatSong,
        likedSongs: JSON.parse(user.likedSongs || "[]"),
        pinnedLists: JSON.parse(user.pinnedLists || "[]"),
        volume: user.volume,
        crossFade: user.crossFade,
        lang: user.lang,
        admin: user.admin == "1" ? true : false,
        superAdmin: user.superAdmin == "1" ? true : false,
        impersonateId: user.impersonateId,
        devUser: user.devUser == "1" ? true : false,
        updatedAt: user.updatedAt,
        createdAt: user.createdAt,
    };
}
