import { ENV } from "@/rockitEnv";
import type { APIContext } from "astro";

import * as fs from "fs/promises";
import * as path from "path";

async function scan(directoryName = "./data", results: string[] = []) {
    let files = await fs.readdir(directoryName);
    for (let f of files) {
        let fullPath = path.join(directoryName, f);
        let stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            await scan(fullPath, results);
        } else {
            results.push(fullPath);
        }
    }
    return results;
}

export async function GET(context: APIContext): Promise<Response> {
    if (
        context.request.headers.get("authorization") != `Bearer ${ENV.API_KEY}`
    ) {
        return new Response("Incorrect API key", { status: 401 });
    }

    const json = (await scan(ENV.SONGS_PATH)).map((path) =>
        path.replace(ENV.SONGS_PATH + "/", "")
    );

    return new Response(JSON.stringify(json), {
        headers: {
            "Content-Type": "application/json",
        },
    });
}
