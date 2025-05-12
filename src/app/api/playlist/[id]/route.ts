import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { parseSong, RawSongDB, SongDB } from "@/lib/db/song";
import { PlaylistDB, parsePlaylist, RawPlaylistDB } from "@/lib/db/playlist";
import { ENV } from "@/rockitEnv";

const BACKEND_URL = ENV.BACKEND_URL;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; // Get the dynamic "id" from the URL
    const searchParams = new URL(request.url).searchParams;

    let playlist: PlaylistDB | undefined;
    playlist = parsePlaylist(
        db
            .prepare(
                `SELECT ${
                    searchParams.get("p") || "*"
                } FROM playlist WHERE id = ?`
            )
            .get(id) as RawPlaylistDB
    );

    if (!playlist) {
        try {
            const response = await fetch(`${BACKEND_URL}/playlist/${id}`, {
                signal: AbortSignal.timeout(2000),
            });
            if (response.ok) {
                playlist = parsePlaylist(
                    db
                        .prepare(
                            `SELECT ${
                                searchParams.get("p") || "*"
                            } FROM playlist WHERE id = ?`
                        )
                        .get(id) as RawPlaylistDB
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

    if (!playlist) {
        return new NextResponse("Playlist not found", { status: 404 });
    }

    if (searchParams.get("song-data") == "false") {
        return NextResponse.json({ ...playlist });
    } else {
        const songs = await Promise.all(
            playlist.songs.map(
                async (playlistSong): Promise<SongDB | string> => {
                    let song;
                    try {
                        const rawSong = db
                            .prepare("SELECT * FROM song WHERE id = ?")
                            .get(playlistSong.id) as RawSongDB;
                        if (rawSong) {
                            song = parseSong(rawSong);
                            if (song) {
                                return song;
                            }
                        }
                    } catch (dbError) {
                        console.error("Database error:", dbError);
                    }

                    return playlistSong.id;
                }
            )
        );
        return NextResponse.json({ ...playlist, songs });
    }
}
