import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const response = fetch(
        `http://localhost:8000/start-download?url=${context.url.searchParams.get(
            "url"
        )}&user=${context.locals.user.id}`
    );

    return response;
}
