import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const { id } = await params; // Get the dynamic "id" from the URL

    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const downloads = db
        .prepare("UPDATE download SET seen = 1 WHERE id = ? AND userId = ?")
        .run(id, session.user.id);
    return NextResponse.json(downloads);
}
