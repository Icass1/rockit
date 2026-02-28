interface ApiFetchOptions {
    headers?: HeadersInit;
    auth?: boolean;
    // AbortSignal para cancelar la request (usado en searchManager)
    signal?: AbortSignal;
}

export default async function apiFetch(
    path: string,
    options?: ApiFetchOptions
): Promise<Response | undefined> {
    const { rockIt } = await import("@/lib/rockit/rockIt");

    if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");

        const cookieStore = await cookies();
        const session = cookieStore.get("session_id")?.value;

        const res = await fetch(`${rockIt.BACKEND_URL}${path}`, {
            headers: {
                Cookie: `session_id=${session}`,
            },
            cache: "no-store",
            // signal no se pasa en SSR — las llamadas server-side no se cancelan
        });

        return res;
    } else {
        return fetch(`${rockIt.BACKEND_URL}${path}`, {
            headers: { ...options?.headers },
            credentials: "include",
            signal: options?.signal,
        });
    }
}
