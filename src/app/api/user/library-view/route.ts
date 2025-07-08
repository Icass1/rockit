import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const data = await request.json();

    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }
    if (!data.view || (data.view !== "grid" && data.view !== "byArtist")) {
        return NextResponse.json(
            { error: "Invalid view type" },
            { status: 400 }
        );
    }
    console.log(data);
    db.prepare("UPDATE user SET libraryView = ? WHERE id = ?").run(
        data.view,
        session.user.id
    );

    return new NextResponse("OK");
}
