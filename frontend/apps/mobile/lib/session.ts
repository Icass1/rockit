import {
    AUTH_ENDPOINTS,
    SessionResponseSchema,
    type SessionResponse,
} from "@rockit/shared";
import { apiFetch } from "./api";

export async function getSession(): Promise<SessionResponse | null> {
    const response = await apiFetch(
        AUTH_ENDPOINTS.session,
        SessionResponseSchema
    );

    if (response.isOk()) {
        return response.result;
    } else {
        console.error(response.message, response.detail);
        return null;
    }
}
