import { getSession } from "@/lib/auth/getSession";
import { statsQueue } from "@/lib/jobs/queue";
import { Stats } from "@/lib/stats";
import { NextRequest, NextResponse } from "next/server";

export interface ApiStats {
    albums: Stats["albums"];
    artists: Stats["artists"];
    songs: Stats["songs"];
}

export async function GET(request: NextRequest) {
    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const jobId = request.nextUrl.searchParams.get("jobId");
    if (jobId) {
        const job = await statsQueue.getJob(jobId);
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

    const url = new URL(request.url);

    const startString: string | undefined =
        url.searchParams.get("start") ?? undefined;
    const endString: string | undefined =
        url.searchParams.get("end") ?? undefined;

    console.log("request.url", request.url);

    const job = await statsQueue.add("generateStats", {
        userId: session.user.id,
        startString,
        endString,
        url: request.url,
    });

    return NextResponse.json({ jobId: job.id, state: "queued" });
}
