interface ApiFetchOptions {
    headers?: HeadersInit;
    auth?: boolean;
}

export default async function apiFetch(
    path: string,
    options?: ApiFetchOptions
): Promise<Response | undefined> {
    const { rockIt } = await import("@/lib/rockit/rockIt");

    return fetch(`${rockIt.BACKEND_URL}${path}`, {
        headers: { ...options?.headers },
        credentials: "include",
    });
}
