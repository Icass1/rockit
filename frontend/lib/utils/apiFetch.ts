import { BACKEND_URL } from "@/environment";

interface ApiFetchOptions {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
    auth?: boolean;
    signal?: AbortSignal;
}

export default async function apiFetch(
    path: string,
    options: ApiFetchOptions = {}
): Promise<Response> {
    const { method = "GET", headers, body, signal } = options;

    if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");

        const cookieStore = await cookies();
        const session = cookieStore.get("session_id")?.value;

        const res = await fetch(`${BACKEND_URL}${path}`, {
            method,
            headers: {
                Cookie: `session_id=${session}`,
                ...headers,
            },
            body,
            cache: "no-store",
        });

        return res;
    } else {
        return fetch(`${BACKEND_URL}${path}`, {
            method,
            headers: { ...headers },
            body,
            credentials: "include",
            signal,
        });
    }
}
