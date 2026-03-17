import { SessionResponseSchema } from "@/dto";
import { BACKEND_URL } from "@/environment";

export async function getUserInClient() {
    const res = await fetch(`${BACKEND_URL}/user/session`, {
        credentials: "include",
    });

    if (!res.ok) {
        console.warn(
            "Failed to fetch user session:",
            res.status,
            res.statusText
        );
        return undefined;
    }

    const json = await res.json();
    const parsed = SessionResponseSchema.parse(json);

    return parsed;
}
