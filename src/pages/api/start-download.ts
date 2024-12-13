import { ENV } from "@/rockitEnv";
import type { APIContext } from "astro";

const BACKEND_URL = ENV.BACKEND_URL;

console.log({ BACKEND_URL });

export async function GET(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const response = fetch(
        `${BACKEND_URL}/start-download?url=${context.url.searchParams.get(
            "url"
        )}&user=${context.locals.user.id}`
    );

    return response;
}
