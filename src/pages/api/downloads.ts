import type { APIContext } from "astro";
const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    let response;

    try {
        response = await fetch(
            `${BACKEND_URL}/downloads?user=${context.locals.user.id}`,
            {
                signal: AbortSignal.timeout(2000),
            }
        );
    } catch {
        return new Response("Error connecting to backend", { status: 500 });
    }

    return response;
}
