import { getSession, signOut } from "next-auth/react";
import { rockitIt } from "@/lib/rockit";

export default async function apiFetch(
    path: string,
    auth: boolean = true
): Promise<Response | undefined> {
    let token;
    if (auth) token = localStorage.getItem("access_token");

    if (!token && auth) {
        const session = await getSession();
        if (!session?.user.access_token) {
            console.warn("apiFetch -> /login");
            signOut();
            window.location.href = "/login";
            return;
        }
        token = session?.user.access_token;

        localStorage.setItem("access_token", token);
    }

    const headers: HeadersInit = {};
    if (auth) {
        headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${rockitIt.BACKEND_URL}${path}`, {
        headers,
    });
}
