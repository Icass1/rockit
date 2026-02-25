import { cookies } from "next/headers";
import { SessionResponse, SessionResponseSchema } from "@/dto";

export async function getUserInServer(): Promise<SessionResponse | undefined> {
    const { rockIt } = await import("@/lib/rockit/rockIt");
    const cookieStore = await cookies();
    const session = cookieStore.get("session_id")?.value;

    const res = await fetch(`${rockIt.BACKEND_URL}/user/session`, {
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
