import { db } from "@/lib/db/db";
import {
    parseUser,
    type RawUserDB,
    type UserDB,
    type UserDBList,
} from "@/lib/db/user";
import type { APIContext } from "astro";
import { generateId } from "lucia";

export async function POST(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const data = (await context.request.json()) as {
        name: string;
    };

    const playlistId = generateId(16);
    try {
        db.prepare(
            "INSERT INTO playlist (id, image, name, description, owner, followers, songs, updatedAt, createdAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
            playlistId,
            "",
            data.name,
            "",
            context.locals.user.username,
            0,
            "[]",
            new Date().toISOString(),
            new Date().toISOString()
        );
    } catch (error) {
        console.error(error?.toString());
        return new Response("Error inserting new playlist", { status: 500 });
    }

    const newList: UserDBList = {
        id: playlistId,
        type: "playlist",
        createdAt: new Date().getTime(),
    };

    const user = parseUser(
        db
            .prepare("SELECT lists FROM user WHERE id = ?")
            .get(context.locals.user.id) as RawUserDB
    ) as UserDB<"lists">;

    db.prepare(`UPDATE user SET lists = ? WHERE id = ?`).run(
        JSON.stringify([...user?.lists, newList]),
        context.locals.user.id
    );

    return new Response(JSON.stringify({ id: playlistId }), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
