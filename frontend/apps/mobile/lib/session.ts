import { type SessionResponse } from "@rockit/shared";
import { Http } from "@/lib/http";

export async function getSession(): Promise<SessionResponse | null> {
    const response = await Http.getSession();

    if (response.isOk()) {
        return response.result;
    } else {
        console.error(response.message, response.detail);
        return null;
    }
}
