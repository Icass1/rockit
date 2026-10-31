import type { SessionResponse } from "@/dto";
import { Http } from "@/lib/http";

export async function getUserInClient(): Promise<SessionResponse | undefined> {
    const session = await Http.getSession();

    if (session.isNotOk()) {
        console.error(
            "Failed to fetch user session:",
            session.code,
            session.message
        );
        return undefined;
    }

    return session.result;
}
