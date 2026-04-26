import {
    AUTH_ENDPOINTS,
    EQueueType,
    SessionResponseSchema,
    type SessionResponse,
} from "@rockit/shared";
import { apiFetch } from "./api";
import {
    createUser,
    getFirstUser,
    getUserByUsername,
    updateUser,
} from "./database/access/userAccess";
import { checkNetworkConnection } from "./network";

const QUEUE_TYPE_VALUES = Object.values(EQueueType);

function queueTypeKeyToString(key: number): EQueueType {
    return QUEUE_TYPE_VALUES[key - 1];
}

function queueTypeStringToKey(type: EQueueType): number {
    return QUEUE_TYPE_VALUES.indexOf(type) + 1;
}

async function saveSessionToSqlite(session: SessionResponse): Promise<void> {
    const queueTypeKey = queueTypeStringToKey(session.queueType as EQueueType);

    const existing = await getUserByUsername(session.username);
    if (existing) {
        await updateUser(existing.id, {
            admin: session.admin,
            queueTypeKey,
            currentTimeMs: session.currentTimeMs,
        });
    } else {
        await createUser({
            publicId: session.username,
            username: session.username,
            admin: session.admin,
            queueTypeKey: queueTypeKey,
            currentTimeMs: session.currentTimeMs ?? undefined,
        });
    }
}

async function getSessionFromSqlite(): Promise<SessionResponse | null> {
    const user = await getFirstUser();
    if (!user) return null;
    return {
        username: user.username,
        image: "",
        admin: user.admin,
        queueType: queueTypeKeyToString(user.queueTypeKey),
        currentTimeMs: user.currentTimeMs ?? null,
    };
}

export async function getSession(): Promise<SessionResponse | null> {
    const isOnline = await checkNetworkConnection();

    if (isOnline) {
        const response = await apiFetch(
            AUTH_ENDPOINTS.session,
            SessionResponseSchema
        );

        if (response.isOk()) {
            saveSessionToSqlite(response.result).catch(console.error);
            return response.result;
        } else {
            console.error(response.message, response.detail);
            return null;
        }
    } else {
        return getSessionFromSqlite();
    }
}
