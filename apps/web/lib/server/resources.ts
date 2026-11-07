import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { HttpResult } from "@rockit/shared/models/types/httpTypes";
import { ServerHttp } from "@/lib/api/server";
import { AppError } from "@/lib/errors/AppError";

/** Classify expected route responses before Next sanitizes server errors. */
export function requireResult<T>(response: HttpResult<T>): T {
    if (response.isOk()) return response.result;
    if (response.code === 401) redirect("/login");
    if (response.code === 404) notFound();
    throw new AppError(response.code >= 400 ? response.code : 503);
}

export const getAlbum = cache(async (publicId: string) =>
    requireResult(await ServerHttp.getAlbum(publicId))
);
export const getPlaylist = cache(async (publicId: string) =>
    requireResult(await ServerHttp.getPlaylist(publicId))
);
export const getArtist = cache(async (publicId: string) =>
    requireResult(await ServerHttp.getArtistCatalogPage(publicId))
);
export const getArtistByName = cache(async (name: string) =>
    requireResult(await ServerHttp.getArtistPageByName(name))
);
export const getFeaturedListAsync = cache(
    async (
        type:
            | "liked"
            | "most-listened"
            | "recent-mix"
            | "last-month"
            | "year-recap"
    ) => {
        switch (type) {
            case "liked":
                return requireResult(await ServerHttp.getFeaturedLiked());
            case "most-listened":
                return requireResult(
                    await ServerHttp.getFeaturedMostListened()
                );
            case "recent-mix":
                return requireResult(await ServerHttp.getFeaturedRecentMix());
            case "last-month":
                return requireResult(await ServerHttp.getFeaturedLastMonth());
            case "year-recap":
                return requireResult(await ServerHttp.getFeaturedYearRecap());
        }
    }
);
