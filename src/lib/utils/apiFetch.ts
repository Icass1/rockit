import { getSession, signOut } from "next-auth/react";

export default async function apiFetch(path: string): Promise<Response | undefined> {
    let token = localStorage.getItem("access_token");

    if (!token) {
        const session = await getSession();
        if (!session?.user.access_token) {
            console.warn("apiFetch -> /login")
            signOut();
            window.location.href = "/login";
            return;
        }
        token = session?.user.access_token;

        localStorage.setItem("access_token", token);
    }

    return fetch(`http://localhost:8000${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}
