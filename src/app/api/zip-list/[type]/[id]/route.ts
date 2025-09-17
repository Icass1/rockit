import { getSession } from "@/lib/auth/getSession";
import { AlbumDB, parseAlbum, RawAlbumDB } from "@/lib/db/album";
import { db } from "@/lib/db/db";
import { parsePlaylist, PlaylistDB, RawPlaylistDB } from "@/lib/db/playlist";
import { zipDirectoryQueue } from "@/lib/jobs/queue";
import { sanitizeFolderName } from "@/lib/sanetizeFolderName";
import { ENV } from "@/rockitEnv";
import { readFile, rm } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; type: string }> }
) {
    const session = await getSession();
    const { id, type } = await params;

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const jobId = request.nextUrl.searchParams.get("jobId");
    if (jobId) {
        const job = await zipDirectoryQueue.getJob(jobId);
        if (!job)
            return NextResponse.json(
                { error: "Job not found" },
                { status: 404 }
            );

        const state = await job.getState();
        if (state === "failed") {
            const reason = job.failedReason || "Unknown error";
            return NextResponse.json({ state, error: reason }, { status: 500 });
        } else if (state === "completed") {
            return NextResponse.json({ state, result: job.returnvalue });
        }

        return NextResponse.json({ state });
    }

    let path = "";
    let name = "";

    if (type == "album") {
        const album = parseAlbum(
            db
                .prepare("SELECT name, artists FROM album WHERE id = ?")
                .get(id) as RawAlbumDB
        ) as AlbumDB<"name" | "artists">;

        path = join(
            sanitizeFolderName(album.artists[0].name),
            sanitizeFolderName(album.name)
        );

        name = album.name;

        console.log(album);
    } else if (type == "playlist") {
        const playlist = parsePlaylist(
            db
                .prepare("SELECT name, owner FROM playlist WHERE id = ?")
                .get(id) as RawPlaylistDB
        ) as PlaylistDB<"name" | "owner">;
        path = join(
            sanitizeFolderName(playlist.owner),
            sanitizeFolderName(playlist.name)
        );
        name = playlist.name;
    }

    const getId = request.nextUrl.searchParams.get("getId");
    if (getId) {
        const fileBuffer = await readFile(
            join(ENV.TEMP_PATH, sanitizeFolderName(getId))
        );

        const response = new NextResponse(fileBuffer);
        response.headers.set("Content-Type", "application/zip");
        response.headers.set(
            "Content-Disposition",
            `attachment; filename="${name}.zip"`
        );

        await rm(join(ENV.TEMP_PATH, sanitizeFolderName(getId)));

        return response;
    }

    path = join(ENV.SONGS_PATH, path);
    path = path;

    console.log({ path });

    const job = await zipDirectoryQueue.add("generateStats", {
        path,
    });

    return NextResponse.json({ jobId: job.id, state: "queued" });
}
