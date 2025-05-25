import { getSession } from "@/lib/auth/getSession";
import { SongDB } from "@/lib/db/song";
import { homeStatsQueue } from "@/lib/jobs/queue";
import { NextRequest, NextResponse } from "next/server";

type SongsType = SongDB<
    "id" | "name" | "artists" | "albumId" | "albumName" | "duration" | "image"
>[];

export interface HomeStats {
    songsByTimePlayed: SongsType;
    randomSongsLastMonth: SongsType;
    nostalgicMix: SongsType;
    hiddenGems: SongsType;
    communityTop: SongsType;
    monthlyTop: SongsType;
    moodSongs: SongsType;
}

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const jobId = req.nextUrl.searchParams.get("jobId");

    if (jobId) {
        const job = await homeStatsQueue.getJob(jobId);
        if (!job)
            return NextResponse.json(
                { error: "Job not found" },
                { status: 404 }
            );

        const state = await job.getState();
        if (state === "completed") {
            return NextResponse.json({ state, result: job.returnvalue });
        }

        return NextResponse.json({ state });
    }

    const job = await homeStatsQueue.add("generateStats", {
        userId: session.user.id,
    });

    return NextResponse.json({ jobId: job.id, state: "queued" });
}
