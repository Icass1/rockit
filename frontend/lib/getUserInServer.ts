import { cookies } from "next/headers";
import { SessionResponse, SessionResponseSchema } from "@/dto";
import { BACKEND_URL } from "@/environment";

export async function getUserInServer(): Promise<SessionResponse | undefined> {
    const cookieStore = await cookies();
    const session = cookieStore.get("session_id")?.value;

    const res = await fetch(`${BACKEND_URL}/user/session`, {
        headers: {
            Cookie: `session_id=${session}`,
        },
        cache: "no-store",
    });

    if (!res.ok) return undefined;

    const json = await res.json();
    const parsed = SessionResponseSchema.parse(json);

    return parsed;
}
