import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { ILibraryInitialData } from "@/models/interfaces/library";
import { ServerHttp } from "@/lib/api/server";
import { AppError } from "@/lib/errors/AppError";
import { getUserInServer } from "@/lib/getUserInServer";
import { requireResult } from "@/lib/server/resources";

export const getInitialLibrary = cache(
    async (): Promise<ILibraryInitialData> => {
        const [session, library, stats] = await Promise.all([
            getUserInServer(),
            ServerHttp.getUserLibraryMedias(),
            ServerHttp.getUserStats({
                range: "30d",
                start: null,
                end: null,
                timezoneOffsetMinutes: 0,
            }),
        ]);
        if (!session) redirect("/login");
        if (session === "offline") throw new AppError(503);
        return {
            username: session.username,
            library: requireResult(library),
            topAlbums: requireResult(stats).topAlbums,
        };
    }
);
