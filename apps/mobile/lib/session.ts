import type { SessionResponse } from "@rockit/shared";
import { clearSessionCookie } from "@/lib/api";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

/** Revoke the server cookie before leaving an authenticated browser shell. */
export async function logout(): Promise<boolean> {
    const response = await Http.logoutUser();
    if (!response.isOk() && response.code !== 401) return false;
    rockIt.stop();
    await clearSessionCookie();
    return true;
}

export async function getSession(): Promise<SessionResponse | null> {
    const response = await Http.getSession();
    return response.isOk() ? response.result : null;
}
