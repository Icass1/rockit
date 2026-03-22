import {
    AUTH_ENDPOINTS,
    SessionResponseSchema,
    type SessionResponse,
} from "@rockit/shared";
import { apiFetch } from "./api";

export async function getSession(): Promise<SessionResponse | null> {
    try {
        const res = await apiFetch(AUTH_ENDPOINTS.session);
        if (!res.ok) return null;
        const json = await res.json();
        return SessionResponseSchema.parse(json);
    } catch {
        return null;
    }
}
