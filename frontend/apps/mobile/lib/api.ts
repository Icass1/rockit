import * as SecureStore from "expo-secure-store";

type ZodSchema<T> = {
    parse: (data: unknown) => T;
};

const SESSION_KEY = "session_id";

export const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ?? "EXPO_PUBLIC_BACKEND_URL";

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

export async function apiGet<T>(
    path: string,
    schema: ZodSchema<T>
): Promise<T> {
    const response = await doFetch(path, { method: "GET" });
    const json = await response.json();
    return schema.parse(json);
}

export async function apiPost<TBody, TResponse>(
    path: string,
    bodySchema: ZodSchema<TBody>,
    body: TBody,
    responseSchema: ZodSchema<TResponse>
): Promise<TResponse> {
    bodySchema.parse(body);
    const response = await doFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
    });
    const json = await response.json();
    return responseSchema.parse(json);
}

export async function apiPatch<TBody, TResponse>(
    path: string,
    bodySchema: ZodSchema<TBody>,
    body: TBody,
    responseSchema: ZodSchema<TResponse>
): Promise<TResponse> {
    bodySchema.parse(body);
    const response = await doFetch(path, {
        method: "PATCH",
        body: JSON.stringify(body),
    });
    const json = await response.json();
    return responseSchema.parse(json);
}

export async function apiPatchNoResponse<TBody>(
    path: string,
    bodySchema: ZodSchema<TBody>,
    body: TBody
): Promise<void> {
    bodySchema.parse(body);
    await doFetch(path, {
        method: "PATCH",
        body: JSON.stringify(body),
    });
}

export async function apiPostAuth<TBody, TResponse>(
    path: string,
    bodySchema: ZodSchema<TBody>,
    body: TBody,
    responseSchema: ZodSchema<TResponse>
): Promise<{ response: Response; data: TResponse }> {
    bodySchema.parse(body);
    const response = await doFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
    });
    const json = await response.json();
    const data = responseSchema.parse(json);
    return { response, data };
}

async function doFetch(
    path: string,
    options: RequestInit = {}
): Promise<Response> {
    return fetch(`${BACKEND_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });
}
