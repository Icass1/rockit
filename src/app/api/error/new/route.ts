import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { generateId } from "@/lib/generateId";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const data = await request.json();

    const session = await getSession();

    console.warn("New error to check");

    const {
        msg,
        source,
        lineNo,
        columnNo,
        errorMessage,
        errorCause,
        errorName,
        errorStack,
    }: {
        msg: string;
        source: string;
        lineNo: number;
        columnNo: number;
        errorMessage: string;
        errorCause: string;
        errorName: string;
        errorStack: string;
    } = data;

    db.prepare(
        "INSERT INTO error (id, msg, source, lineNo, columnNo, errorMessage, errorCause, errorName, errorStack, dateAdded, userId) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
        generateId(16),
        msg,
        source,
        lineNo,
        columnNo,
        errorMessage,
        errorCause,
        errorName,
        errorStack,
        new Date().toISOString(),
        session?.user?.id
    );

    return new NextResponse("OK");
}
