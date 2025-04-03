import { parseAlbum, type RawAlbumDB } from "@/lib/db/album";
import { db } from "@/lib/db/db";
import { parsePlaylist, type RawPlaylistDB } from "@/lib/db/playlist";
import {
    parseUser,
    type RawUserDB,
    type UserDB,
    type UserDBList,
} from "@/lib/db/user";
import type * as astro from "astro";

export async function ALL(context: astro.APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const user = parseUser(
        db
            .prepare("SELECT lists FROM user WHERE id = ?")
            .get(context.locals.user.id) as RawUserDB
    ) as UserDB<"lists">;

    const lists = user.lists;
    const type = context.params.type;
    const id = context.params.id;

    let list;

    if (type == "album") {
        list = parseAlbum(
            db
                .prepare("SELECT id,images,name FROM album WHERE id = ?")
                .get(id) as RawAlbumDB
        );
    } else if (type == "playlist") {
        list = parsePlaylist(
            db
                .prepare("SELECT id,images,name FROM playlist WHERE id = ?")
                .get(id) as RawPlaylistDB
        );
    }

    if (!list) {
        return new Response("List not found", { status: 404 });
    }

    if (!id) {
        return new Response("Invalid ID", { status: 400 });
    }

    if (lists.map((list) => list.id).includes(id)) {
        return new Response("List already in user library", { status: 400 });
    }

    db.prepare(`UPDATE user SET lists = ? WHERE id = ?`).run(
        JSON.stringify([
            ...user?.lists,
            {
                createdAt: new Date().getTime(),
                type: type,
                id: id,
            } as UserDBList,
        ]),
        context.locals.user.id
    );

    return new Response(JSON.stringify({ ...list, type: type }), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
