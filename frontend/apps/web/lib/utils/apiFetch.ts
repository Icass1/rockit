import { BACKEND_URL } from "@/environment";
import {
    FastApiError,
    HttpResult,
    type IApiFetchOptions,
    type TZodSchema,
} from "@rockit/shared";

async function baseApiFetch(path: string, options: IApiFetchOptions = {}) {
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
    }

    return fetch(`${BACKEND_URL}${path}`, {
        method,
        headers,
        body,
        credentials: "include",
        signal,
    });
}

export async function apiFetch<T>(
    path: string,
    schema: TZodSchema<T>,
    options: IApiFetchOptions = {}
): Promise<HttpResult<T>> {
    let res: Response;

    try {
        res = await baseApiFetch(path, options);
    } catch (err) {
        return new HttpResult<T>({
            ok: false,
            code: 0,
            message: "Network Error",
            detail: (err as Error).message,
        });
    }

    let json: unknown;

    try {
        json = await res.json();
    } catch {
        return new HttpResult<T>({
            ok: false,
            code: res.status,
            message: res.statusText,
            detail: "Invalid JSON response from server",
        });
    }

    if (!res.ok) {
        const obj = json as { detail?: FastApiError["detail"] };

        return new HttpResult<T>({
            ok: false,
            code: res.status,
            message: res.statusText,
            detail: obj.detail ?? "Unknown error",
        });
    }

    try {
        const parsed = schema.parse(json);
        return new HttpResult<T>({
            ok: true,
            code: res.status,
            message: res.statusText,
            result: parsed,
        });
    } catch (err) {
        return new HttpResult<T>({
            ok: false,
            code: res.status,
            message: "Validation Error",
            detail: (err as Error).message,
        });
    }
}

export async function apiPostFetch<T, G>(
    path: string,
    requestSchema: TZodSchema<T>,
    responseSchema: TZodSchema<G>,
    body: T
): Promise<HttpResult<G>> {
    return apiFetch(path, responseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
