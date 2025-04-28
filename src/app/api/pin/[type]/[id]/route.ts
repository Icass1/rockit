import { getSession } from "@/lib/auth/getSession";
import { parseAlbum, type RawAlbumDB } from "@/lib/db/album";
import { db } from "@/lib/db/db";
import { parsePlaylist, type RawPlaylistDB } from "@/lib/db/playlist";
import {
    parseUser,
    type RawUserDB,
    type UserDB,
    type UserDBPinnedLists,
} from "@/lib/db/user";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; type: string }> }
): Promise<NextResponse> {
    const { id, type } = await params;

    const session = await getSession();

    if (!session?.user) {
        return new NextResponse("Unauthenticated", { status: 401 });
    }

    const user = parseUser(
        db
            .prepare("SELECT pinnedLists FROM user WHERE id = ?")
            .get(session.user.id) as RawUserDB
    ) as UserDB<"pinnedLists">;

    let list;

    if (type == "album") {
        list = parseAlbum(
            db
                .prepare("SELECT id,image,name FROM album WHERE id = ?")
                .get(id) as RawAlbumDB
        );
    } else if (type == "playlist") {
        list = parsePlaylist(
            db
                .prepare("SELECT id,image,name FROM playlist WHERE id = ?")
                .get(id) as RawPlaylistDB
        );
    }

    if (!list) {
        return new NextResponse("List not found", { status: 404 });
    }

    if (!user) {
        return new NextResponse(
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
        session.user.id
    );

    return NextResponse.json({ ...list, type: type });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; type: string }> }
): Promise<NextResponse> {
    const { id, type } = await params;
    const session = await getSession();

    if (!session.user.id) {
        return new NextResponse("Unauthenticated", { status: 401 });
    }

    const user = parseUser(
        db
            .prepare("SELECT pinnedLists FROM user WHERE id = ?")
            .get(session.user.id) as RawUserDB
    ) as UserDB<"pinnedLists">;

    // Comprobar si el elemento que se quiere desanclar existe
    const listToUnpin = user?.pinnedLists?.find(
        (list) => list.type === type && list.id === id
    );

    if (!listToUnpin) {
        return new NextResponse("Item not pinned", { status: 404 });
    }

    // Eliminar el elemento de la lista de pines
    const updatedPinnedLists = user?.pinnedLists.filter(
        (list) => list.type !== type || list.id !== id
    );

    // Actualizar la base de datos
    if (updatedPinnedLists) {
        db.prepare(`UPDATE user SET pinnedLists = ? WHERE id = ?`).run(
            JSON.stringify(updatedPinnedLists),
            session.user.id
        );
    }

    return NextResponse.json({ success: true });
}
