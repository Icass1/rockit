interface ApiFetchOptions {
    headers?: HeadersInit;
    auth?: boolean;
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
        });

        return res;
    } else {
        return fetch(`${rockIt.BACKEND_URL}${path}`, {
            headers: { ...options?.headers },
            credentials: "include",
        });
    }
}
