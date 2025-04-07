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
    db.prepare("UPDATE user SET lang = ? WHERE id = ?").run(
        data.lang,
        session.user.id
    );

    return new NextResponse("OK");
}
