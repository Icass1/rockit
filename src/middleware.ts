import { defineMiddleware } from "astro:middleware";
import { ENV } from "./rockitEnv";

const BACKEND_URL = ENV.BACKEND_URL;

const cache: { [key: string]: { expires_at: number; data: any } } = {};

export const onRequest = defineMiddleware(async (context, next) => {
    const sessionId = context.cookies.get("auth_session2")?.value;

    if (!sessionId) {
        return next();
    }

    if (
        cache[sessionId] &&
        cache[sessionId].expires_at > new Date().getTime()
    ) {
        context.locals.user = cache[sessionId].data;
        return next();
    }

    const response = await fetch(`${BACKEND_URL}/auth/get-user`, {
        method: "POST",
        body: JSON.stringify({
            session_id: sessionId,
            params: ["id", "username", "lang", "admin"],
        }),
        signal: AbortSignal.timeout(2000),
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ENV.API_KEY}`,
        },
    });

    if (!response.ok) {
        return next();
    }

    const user = await response.json();

    cache[sessionId] = {
        data: user,
        expires_at: new Date().getTime() + 1000 * 60 * 60,
    };

    context.locals.user = {
        id: user.id,
        username: user.username,
        lang: user.lang,
        admin: user.admin,
    };

    return next();
});
