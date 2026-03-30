import {
    AUTH_ENDPOINTS,
    isDevFakeMode,
    SessionResponseSchema,
    type SessionResponse,
} from "@rockit/shared";
import { apiGet } from "./api";

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
        return await apiGet(AUTH_ENDPOINTS.session, SessionResponseSchema);
    } catch {
        return null;
    }
}
