import { type SessionResponse } from "@/dto";
import { Http } from "@/lib/http";

export type GetUserResult = SessionResponse | "offline" | undefined;

export async function getUserInServer(): Promise<GetUserResult> {
    const session = await Http.getSession();

    if (session.isOk()) return session.result;

    if (session.code === 401) return undefined;

    return "offline";
}
