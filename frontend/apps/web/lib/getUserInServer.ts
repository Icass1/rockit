import { cookies } from "next/headers";
import { SessionResponseSchema, type SessionResponse } from "@/dto";
import { BACKEND_URL } from "@/environment";
import { apiFetch } from "@/lib/utils/apiFetch";

export async function getUserInServer(): Promise<SessionResponse | undefined> {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    const headers: Record<string, string> = {};
    if (sessionId) {
        headers.Cookie = `session_id=${sessionId}`;
    }

    const session = await apiFetch("/user/session", SessionResponseSchema);

    if (session.isOk()) return session.result;

    console.error(
        `Unable to connect with backend at ${BACKEND_URL}`,
        session.message,
        session.detail
    );
    return undefined;
}
