import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getSession } from "@/lib/auth/getSession";
import { parsePlaylist, PlaylistDB, RawPlaylistDB } from "@/lib/db/playlist";
import { AlbumDB, parseAlbum, RawAlbumDB } from "@/lib/db/album";
import { parseUser, RawUserDB } from "@/lib/db/user";

export async function GET() {
    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const userLists = parseUser(
        db
            .prepare("SELECT lists FROM user WHERE id = ?")
            .get(session.user.id) as RawUserDB
    )?.lists;

    if (!userLists) {
        return new NextResponse("Fatal error, userLists is undefined");
    }

    let playlists: PlaylistDB[] = [];
    let albums: AlbumDB[] = [];
    if (userLists?.filter((list) => list.type == "playlist").length > 0) {
        const playlistsQuery = `SELECT * FROM playlist WHERE id = ${userLists
            ?.filter((list) => list.type == "playlist")
            .map((list) => `'${list.id}'`)
            .join(" OR id = ")}`;
        playlists = (db.prepare(playlistsQuery).all() as RawPlaylistDB[]).map(
            (playlist: RawPlaylistDB) => parsePlaylist(playlist) as PlaylistDB
        );
    }
    if (userLists?.filter((list) => list.type == "album").length > 0) {
        const albumsQuery = `SELECT * FROM album WHERE id = ${userLists
            ?.filter((list) => list.type == "album")
            .map((list) => `'${list.id}'`)
            .join(" OR id = ")}`;
        albums = (db.prepare(albumsQuery).all() as RawAlbumDB[]).map(
            (album) => parseAlbum(album) as AlbumDB
        );
    }

    return NextResponse.json({ playlists, albums });
}
