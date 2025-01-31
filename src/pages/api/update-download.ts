import { db } from "@/lib/db/db";
import { ENV } from "@/rockitEnv";
import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
    if (
        context.request.headers.get("authorization") != `Bearer ${ENV.API_KEY}`
    ) {
        return new Response("Incorrect API key", { status: 401 });
    }

    const data = await context.request.json();

    const id = data.id;
    const userId = data.userId;
    const downloadURL = data.downloadURL;
    const status = data.status;

    try {
        if (status == "ended") {
            db.prepare(
                "UPDATE download SET dateEnded = ?, status = ? WHERE id = ?"
            ).run(new Date().getTime(), status, id);
        } else {
            db.prepare(
                "INSERT INTO download (id, userId, downloadURL, dateStarted, status) VALUES(?, ?, ?, ?, ?)"
            ).run(id, userId, downloadURL, new Date().getTime(), status);
        }

        return new Response("OK");
    } catch (error) {
        console.log("error", error?.toString());
        return new Response("Error", { status: 500 });
    }
}
