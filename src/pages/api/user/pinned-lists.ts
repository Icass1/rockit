import { type AlbumDB } from "@/lib/db/album";
import { db } from "@/lib/db/db";
import { type PlaylistDB } from "@/lib/db/playlist";
import { type UserDB, type UserDBPinnedLists } from "@/lib/db/user";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }
    const DBPinnedLists = (
        (await db
            .prepare("SELECT pinnedLists FROM user WHERE id = ?")
            .get(context.locals.user.id)) as UserDB as UserDB<"pinnedLists">
    ).pinnedLists;

    const getList = async (list: UserDBPinnedLists) => {
        if (list.type == "album") {
            return (await db
                .prepare("SELECT id,image,name FROM album WHERE id = ?")
                .get(list.id)) as AlbumDB;
        } else if (list.type == "playlist") {
            return (await db
                .prepare("SELECT id,image,name FROM playlist WHERE id = ?")
                .get(list.id)) as PlaylistDB;
        }
    };

    const pinnedLists = await Promise.all(
        DBPinnedLists.map(async (list) => {
            return { ...(await getList(list)), type: list.type };
        })
    );

    return new Response(JSON.stringify(pinnedLists), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
