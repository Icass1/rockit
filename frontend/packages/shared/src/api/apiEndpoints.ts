import { AUTH_ENDPOINTS } from "../auth/authEndpoints";

export const API_ENDPOINTS = {
    ...AUTH_ENDPOINTS,
    homeStats: "/stats/home",
    userStats: "/stats/user",
    libraryMedias: "/user/library/medias",
    search: "/media/search",
    userSession: "/user/session",
    userSettings: "/user",
    userLang: "/user/lang",
    userCrossfade: "/user/crossfade",
    userPassword: "/user/password",
    userRandomQueue: "/user/random-queue",
    userRepeatMode: "/user/repeat-mode",
    userQueue: "/user/queue",
    userPlaylists: "/default/playlist",
    mediaAddFromUrl: "/media/url/add",
    addMediaToLibrary: "/user/library/media",
} as const;
