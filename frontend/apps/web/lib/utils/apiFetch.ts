import { BACKEND_URL } from "@/environment";
import { IApiFetchOptions, TZodSchema } from "@/models/types/api";

// Zod v4 compatible type that accepts any Zod schema
export async function apiFetch<T>(
    path: string,
    schema: TZodSchema<T>,
    options: IApiFetchOptions = {}
): Promise<T> {
    const res = await baseApiFetch(path, options);

    const json = await res.json();
    const parsed = schema.parse(json);
    return parsed;
}

export async function baseApiFetch(
    path: string,
    options: IApiFetchOptions = {}
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

export async function apiPostFetch<T>(
    path: string,
    schema: TZodSchema<T>,
    body: T
) {
    return baseApiFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
}
