import { db, type RawSongDB } from "@/lib/db";
import { ENV } from "@/rockitEnv";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    if (
        context.request.headers.get("authorization") != `Bearer ${ENV.API_KEY}`
    ) {
        return new Response("Incorrect API key", { status: 401 });
    }

    const json = db.prepare("SELECT id FROM song").all() as RawSongDB[];

    return new Response(JSON.stringify(json.map((song) => song.id)), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
