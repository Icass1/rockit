import { getSession, signOut } from "next-auth/react";
import { rockitIt } from "@/lib/rockit";

interface ApiFetchOptions {
    headers?: HeadersInit;
    auth?: boolean;
}

export default async function apiFetch(
    path: string,
    options?: ApiFetchOptions
): Promise<Response | undefined> {
    let token;

    const auth = options?.auth ?? true;

    if (auth) token = localStorage.getItem("access_token");

    if (!token && auth) {
        const session = await getSession();
        if (!session?.user.access_token) {
            console.warn("apiFetch -> /login");
            signOut();
            window.location.pathname = "/login";
            return;
        }
        token = session?.user.access_token;

        localStorage.setItem("access_token", token);
    }

    const authHeaders: HeadersInit = {};
    if (auth) {
        authHeaders.Authorization = `Bearer ${token}`;
    }

    return fetch(`${rockitIt.BACKEND_URL}${path}`, {
        headers: { ...options?.headers, ...authHeaders },
    });
}
