import { getSession, signOut } from "next-auth/react";

interface ApiFetchOptions {
    headers?: HeadersInit;
    auth?: boolean;
}

export default async function apiFetch(
    path: string,
    options?: ApiFetchOptions
): Promise<Response | undefined> {
    const { rockIt } = await import("@/lib/rockit/rockIt");

    let token;

    const auth = options?.auth ?? true;

    if (auth) token = localStorage.getItem("access_token");

    if (!token && auth) {
        const session = await getSession();
        if (!session?.user.access_token) {
            if (
                window.location.pathname != "/login" &&
                window.location.pathname != "/signup"
            ) {
                console.warn("apiFetch -> /login");
                signOut();
                window.location.pathname = "/login";
            }
            return;
        }
        token = session?.user.access_token;

        localStorage.setItem("access_token", token);
    }

    const authHeaders: HeadersInit = {};
    if (auth) {
        authHeaders.Authorization = `Bearer ${token}`;
    }

    console.log("(apiFetch)", { rockIt, path });
    return fetch(`${rockIt.BACKEND_URL}${path}`, {
        headers: { ...options?.headers, ...authHeaders },
    });
}
