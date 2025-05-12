import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { parseSong, RawSongDB, SongDB } from "@/lib/db/song";
import { AlbumDB, parseAlbum, RawAlbumDB } from "@/lib/db/album";
import { ENV } from "@/rockitEnv";

const BACKEND_URL = ENV.BACKEND_URL;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; // Get the dynamic "id" from the URL
    const searchParams = new URL(request.url).searchParams;

    let album: AlbumDB | undefined;
    album = parseAlbum(
        db
            .prepare(
                `SELECT ${searchParams.get("p") || "*"} FROM album WHERE id = ?`
            )
            .get(id) as RawAlbumDB
    );

    if (!album) {
        try {
            const response = await fetch(`${BACKEND_URL}/album/${id}`, {
                signal: AbortSignal.timeout(2000),
            });
            if (response.ok) {
                album = parseAlbum(
                    db
                        .prepare(
                            `SELECT ${
                                searchParams.get("p") || "*"
                            } FROM album WHERE id = ?`
                        )
                        .get(id) as RawAlbumDB
                );
            } else {
                console.error(
                    "Backend fetch failed:",
                    response.status,
                    response.statusText
                );
            }
        } catch (fetchError) {
            console.error("Fetch error:", fetchError);
        }
    }

    if (!album) {
        return new NextResponse("Album not found", { status: 404 });
    }
    if (searchParams.get("song-data") == "false") {
        return NextResponse.json({ ...album });
    } else {
        const songs = await Promise.all(
            album.songs.map(async (songId): Promise<SongDB | string> => {
                let song;
                try {
                    const rawSong = db
                        .prepare("SELECT * FROM song WHERE id = ?")
                        .get(songId) as RawSongDB;
                    if (rawSong) {
                        song = parseSong(rawSong);
                        if (song) {
                            return song;
                        }
                    }
                } catch (dbError) {
                    console.error("Database error:", dbError);
                }

                return songId;
            })
        );

        return NextResponse.json({ ...album, songs });
    }
}
