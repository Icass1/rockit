import { AUTH_ENDPOINTS } from "../auth/authEndpoints";

export const API_ENDPOINTS = {
    ...AUTH_ENDPOINTS,
    homeStats: "/stats/home",
    libraryLists: "/library",
    search: "/media/search",
    userSession: "/user/session",
} as const;
