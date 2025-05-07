import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { parseDownload, RawDownloadDB } from "@/lib/db/download";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const downloads = db
        .prepare("SELECT * FROM download WHERE userId = ? AND seen = 0")
        .all(session.user.id)
        .map((entry) => parseDownload(entry as RawDownloadDB));

    return NextResponse.json(downloads);
}
