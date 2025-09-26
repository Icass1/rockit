import { getSession, signOut } from "next-auth/react";
import { rockitIt } from "@/lib/rockit";

export default async function apiFetch(
    path: string
): Promise<Response | undefined> {
    let token = localStorage.getItem("access_token");

    if (!token) {
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

    return fetch(`${rockitIt.BACKEND_URL}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}
