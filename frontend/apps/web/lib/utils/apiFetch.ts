import { BACKEND_URL } from "@/environment";
import { z } from "zod";

interface ApiFetchOptions {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
    auth?: boolean;
    signal?: AbortSignal;
}

export async function apiFetch(
    path: string,
    schema: z.ZodSchema,
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

        const existingHeaders =
            typeof headers === "object" && !Array.isArray(headers)
                ? (headers as Record<string, string>)
                : {};

        const requestHeaders: Record<string, string> = {
            ...existingHeaders,
            ...(session ? { Cookie: `session_id=${session}` } : {}),
        };

        return fetch(`${BACKEND_URL}${path}`, {
            method,
            headers: requestHeaders,
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
