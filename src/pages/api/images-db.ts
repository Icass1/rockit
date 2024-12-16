import { db, type ImageDB } from "@/lib/db";
import { ENV } from "@/rockitEnv";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    if (
        context.request.headers.get("authorization") != `Bearer ${ENV.API_KEY}`
    ) {
        return new Response("Incorrect API key", { status: 401 });
    }

    const json = db.prepare("SELECT path FROM image").all() as ImageDB[];

    return new Response(JSON.stringify(json.map((image) => image.path)), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
