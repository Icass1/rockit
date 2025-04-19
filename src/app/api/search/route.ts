import type { SearchResults } from "@/types/spotify";
import { db } from "@/db/db";
import { ENV } from "@/rockitEnv";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = ENV.BACKEND_URL;

export async function GET(request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url);

    const query = url.searchParams.get("q");
    let response;
    try {
        response = await fetch(`${BACKEND_URL}/search?q=${query}`, {
            signal: AbortSignal.timeout(2000),
        });
    } catch {
        return new NextResponse("Unable to fetch", { status: 404 });
    }

    const json = (await response.json()) as SearchResults;

    for (const index in json.songs) {
        if (!json.songs[index]) {
            continue;
        }
        const song = db
            .prepare("SELECT * FROM song WHERE id = ?")
            .get(json.songs[index].id);
        json.songs[index].inDatabase = song ? true : false;
    }

    for (const index in json.albums) {
        if (!json.albums[index]) {
            continue;
        }
        const album = db
            .prepare("SELECT * FROM album WHERE id = ?")
            .get(json.albums[index].id);
        json.albums[index].inDatabase = album ? true : false;
    }
    for (const index in json.playlists) {
        if (!json.playlists[index]) {
            continue;
        }
        const playlist = db
            .prepare("SELECT * FROM playlist WHERE id = ?")
            .get(json.playlists[index].id);
        json.playlists[index].inDatabase = playlist ? true : false;
    }

    json.playlists = json.playlists.filter((playlist) => playlist);
    json.albums = json.albums.filter((album) => album);
    json.songs = json.songs.filter((song) => song);

    return NextResponse.json(json);
}
