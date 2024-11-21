import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    let response;

    try {
        response = await fetch(
            `http://localhost:8000/downloads?user=${context.locals.user.id}`
        );
    } catch {
        return new Response("Error connecting to backend");
    }

    return response;
}
