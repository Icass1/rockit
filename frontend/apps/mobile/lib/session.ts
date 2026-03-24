import {
    AUTH_ENDPOINTS,
    isDevFakeMode,
    SessionResponseSchema,
    type SessionResponse,
} from "@rockit/shared";
import { apiFetch } from "./api";

const FAKE_SESSION: SessionResponse = {
    username: "dev",
    image: "",
    admin: false,
    queueType: null,
    currentTimeMs: null,
};

export async function getSession(): Promise<SessionResponse | null> {
    if (isDevFakeMode()) {
        return FAKE_SESSION;
    }

    try {
        const res = await apiFetch(AUTH_ENDPOINTS.session);
        if (!res.ok) return null;
        const json = await res.json();
        return SessionResponseSchema.parse(json);
    } catch {
        return null;
    }
}
