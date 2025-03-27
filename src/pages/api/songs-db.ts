import { db } from "@/lib/db/db";
import type { SongDB } from "@/lib/db/song";
import { ENV } from "@/rockitEnv";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    if (
        context.request.headers.get("authorization") != `Bearer ${ENV.API_KEY}`
    ) {
        return new Response("Incorrect API key", { status: 401 });
    }

    const json = (await db.prepare("SELECT id FROM song").all()) as SongDB[];

    return new Response(JSON.stringify(json.map((song) => song.id)), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
