import { cookies } from "next/headers";
import { SessionResponseSchema, type SessionResponse } from "@/dto";
import { BACKEND_URL } from "@/environment";
import { apiFetch } from "@/lib/utils/apiFetch";

export async function getUserInServer(): Promise<SessionResponse | undefined> {
    const cookieStore = await cookies();
    const session = cookieStore.get("session_id")?.value;

    const headers: Record<string, string> = {};
    if (session) {
        headers.Cookie = `session_id=${session}`;
    }

    try {
        const session = await apiFetch("/user/session", SessionResponseSchema);
        return session;
    } catch (e) {
        console.error(`Unable to connect with backend at ${BACKEND_URL}. ${e}`);
        return undefined;
    }
}
