import { AUTH_ENDPOINTS } from "../auth/authEndpoints";

export const API_ENDPOINTS = {
    ...AUTH_ENDPOINTS,
    homeStats: "/stats/home",
    libraryLists: "/user/library/lists",
    search: "/media/search",
    userSession: "/user/session",
    userSettings: "/user",
    userLang: "/user/lang",
    userCrossfade: "/user/crossfade",
    userPassword: "/user/password",
    userRandomQueue: "/user/random-queue",
    userRepeatMode: "/user/repeat-mode",
} as const;
