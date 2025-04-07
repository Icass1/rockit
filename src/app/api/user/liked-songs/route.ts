import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { parseUser, RawUserDB, UserDB } from "@/lib/db/user";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const userLikedSongs = (
        parseUser(
            db
                .prepare("SELECT likedSongs FROM user WHERE id = ?")
                .get(session.user.id) as RawUserDB
        ) as UserDB<"likedSongs">
    ).likedSongs;

    return NextResponse.json(userLikedSongs);
}
