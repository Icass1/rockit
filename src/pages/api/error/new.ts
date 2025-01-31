import { db } from "@/db/db";
import type { APIContext } from "astro";
import { generateId } from "lucia";

export async function POST(context: APIContext): Promise<Response> {
    const data = await context.request.json();

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
        new Date().getTime(),
        context.locals.user?.id
    );

    return new Response("OK", { status: 200 });
}
