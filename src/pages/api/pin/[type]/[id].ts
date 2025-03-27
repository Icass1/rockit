import { type AlbumDB } from "@/lib/db/album";
import { db } from "@/lib/db/db";
import { type PlaylistDB } from "@/lib/db/playlist";
import { type UserDB, type UserDBPinnedLists } from "@/lib/db/user";
import type { APIContext } from "astro";

export async function ALL(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const user = (await db
        .prepare("SELECT pinnedLists FROM user WHERE id = ?")
        .get(context.locals.user.id)) as UserDB as UserDB<"pinnedLists">;

    const type = context.params.type;
    const id = context.params.id;

    let list;

    if (type == "album") {
        list = (await db
            .prepare("SELECT id,image,name FROM album WHERE id = ?")
            .get(id)) as AlbumDB;
    } else if (type == "playlist") {
        list = (await db
            .prepare("SELECT id,image,name FROM playlist WHERE id = ?")
            .get(id)) as PlaylistDB;
    }

    if (!list) {
        return new Response("List not found", { status: 404 });
    }

    if (!user) {
        return new Response(
            "Interal server error. User is not in database but is logged in",
            { status: 500 }
        );
    }

    db.prepare(`UPDATE user SET pinnedLists = ? WHERE id = ?`).run(
        JSON.stringify([
            ...user?.pinnedLists,
            {
                createdAt: new Date().getTime(),
                type: type,
                id: id,
            } as UserDBPinnedLists,
        ]),
        context.locals.user.id
    );

    return new Response(JSON.stringify({ ...list, type: type }), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
