import { SessionResponseSchema } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";

export async function getUserInClient() {
    const res = await fetch(`${rockIt.BACKEND_URL}/user/session`, {
        credentials: "include",
    });

    const json = await res.json();
    const parsed = SessionResponseSchema.parse(json);

    return parsed;
}
