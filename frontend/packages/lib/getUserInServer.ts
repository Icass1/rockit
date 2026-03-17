import { cookies } from "next/headers";
import { BACKEND_URL } from "@/environment";
import { SessionResponse, SessionResponseSchema } from "@/packages/dto";

export async function getUserInServer(): Promise<SessionResponse | undefined> {
    const cookieStore = await cookies();
    const session = cookieStore.get("session_id")?.value;

    const headers: Record<string, string> = {};
    if (session) {
        headers.Cookie = `session_id=${session}`;
    }

    const res = await fetch(`${BACKEND_URL}/user/session`, {
        headers,
        cache: "no-store",
    });

    if (!res.ok) return undefined;

    const json = await res.json();
    const parsed = SessionResponseSchema.parse(json);

    return parsed;
}
