import { db } from "@/lib/db/db";
import { type UserDB } from "@/lib/db/user";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }
    const userLikedSongs = (
        (await db
            .prepare("SELECT likedSongs FROM user WHERE id = ?")
            .get(context.locals.user.id)) as UserDB as UserDB<"likedSongs">
    ).likedSongs;

    return new Response(JSON.stringify(userLikedSongs.map((song) => song.id)), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
