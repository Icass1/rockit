import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
    return new Response("OK");
}
