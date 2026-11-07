import { type SessionResponse } from "@/dto";
import "server-only";
import { cache } from "react";
import { ServerHttp } from "@/lib/api/server";

export type GetUserResult = SessionResponse | "offline" | undefined;

export const getUserInServer = cache(async (): Promise<GetUserResult> => {
    const session = await ServerHttp.getSession();

    if (session.isOk()) return session.result;

    if (session.code === 401) return undefined;

    return "offline";
});
