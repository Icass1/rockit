import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import {
    parseUser,
    type RawUserDB,
    type UserDB,
    type UserDBList,
} from "@/lib/db/user";
import { generateId } from "@/lib/generateId";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
    const session = await getSession();

    if (!session?.user.id) {
        return new NextResponse("Unauthenticated", { status: 401 });
    }

    const data = (await request.json()) as {
        name: string;
    };

    const playlistId = generateId(16);
    try {
        db.prepare(
            "INSERT INTO playlist (id, image, name, description, owner, followers, songs, updatedAt, createdAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
            playlistId,
            "",
            data.name,
            "",
            session.user.username,
            0,
            "[]",
            new Date().toISOString(),
            new Date().toISOString()
        );
    } catch (error) {
        console.error(error?.toString());
        return new NextResponse("Error inserting new playlist", {
            status: 500,
        });
    }

    const newList: UserDBList = {
        id: playlistId,
        type: "playlist",
        createdAt: new Date().getTime(),
    };

    const user = parseUser(
        db
            .prepare("SELECT lists FROM user WHERE id = ?")
            .get(session.user.id) as RawUserDB
    ) as UserDB<"lists">;

    db.prepare(`UPDATE user SET lists = ? WHERE id = ?`).run(
        JSON.stringify([...user?.lists, newList]),
        session.user.id
    );

    return NextResponse.json({ id: playlistId });
}
