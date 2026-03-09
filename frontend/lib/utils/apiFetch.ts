import { BACKEND_URL } from "@/environment";
import { ZodType } from "zod";

interface ApiFetchOptions {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
    auth?: boolean;
    signal?: AbortSignal;
}

export async function apiFetch<T extends ZodType>(
    path: string,
    schema: T,
    options: ApiFetchOptions = {}
) {
    const res = await baseApiFetch(path, options);

    const json = await res.json();
    const parsed = schema.parse(json);
    return parsed;
}

export async function baseApiFetch(
    path: string,
    options: ApiFetchOptions = {}
) {
    const { method = "GET", headers, body, signal } = options;

    if (!path.startsWith("/")) {
        console.warn(`'${path}' doesn't start with /`);
    }

    if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const session = cookieStore.get("session_id")?.value;

        return fetch(`${BACKEND_URL}${path}`, {
            method,
            headers: {
                Cookie: `session_id=${session}`,
                ...headers,
            },
            body,
            cache: "no-store",
        });
    } else {
        return fetch(`${BACKEND_URL}${path}`, {
            method,
            headers,
            body,
            credentials: "include",
            signal,
        });
    }
}

export async function apiPostFetch<T>(path: string, body: T) {
    return baseApiFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
}
