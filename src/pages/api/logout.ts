// import { lucia } from "@/auth";
import type { APIContext } from "astro";

export async function ALL(context: APIContext): Promise<Response> {
    const sessionCookie = context.cookies.get(lucia.sessionCookieName);

    if (!sessionCookie) {
        return new Response(JSON.stringify({ error: "No session found" }), {
            status: 400,
        });
    }

    try {
        await lucia.invalidateSession(sessionCookie.value);
        context.cookies.delete("session");
        return new Response("/login", { status: 307 });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to logout" }), {
            status: 500,
        });
    }
}
