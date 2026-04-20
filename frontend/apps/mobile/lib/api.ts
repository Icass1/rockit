import {
    BACKEND_URL,
    FastApiError,
    HttpResult,
    type IApiFetchOptions,
    type TZodSchema,
} from "@rockit/shared";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "session_id";

export { BACKEND_URL };

export async function getSessionCookie(): Promise<string | null> {
    return SecureStore.getItemAsync(SESSION_KEY);
}

export async function saveSessionCookie(response: Response): Promise<void> {
    const setCookie = response.headers.get("set-cookie");

    if (!setCookie) return;

    const match = setCookie.match(/session_id=([^;,\s]+)/);

    if (match?.[1]) {
        await SecureStore.setItemAsync(SESSION_KEY, match[1]);
    }
}

export async function clearSessionCookie(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
}

async function baseApiFetch(
    path: string,
    options: IApiFetchOptions = {}
): Promise<Response> {
    const { method = "GET", headers, body, signal } = options;

    const cookie = await getSessionCookie();

    const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(typeof headers === "object" && !Array.isArray(headers)
            ? (headers as Record<string, string>)
            : {}),
        ...(cookie ? { Cookie: `session_id=${cookie}` } : {}),
    };

    return fetch(`${BACKEND_URL}${path}`, {
        method,
        headers: requestHeaders,
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
    _requestSchema: TZodSchema<T>,
    responseSchema: TZodSchema<G>,
    body: T
): Promise<HttpResult<G>> {
    return apiFetch(path, responseSchema, {
        method: "POST",
        body: JSON.stringify(body),
    });
}
export async function apiPatchFetch<T, G>(
    path: string,
    _requestSchema: TZodSchema<T>,
    responseSchema: TZodSchema<G>,
    body: T
): Promise<HttpResult<G>> {
    return apiFetch(path, responseSchema, {
        method: "PATCH",
        body: JSON.stringify(body),
    });
}
