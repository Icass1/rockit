import { db, type ImageDB } from "@/lib/db";
import { ENV } from "@/rockitEnv";
import type { APIContext } from "astro";
import { writeFile, mkdir } from "fs/promises";
import * as crypto from "node:crypto";
import { join, dirname } from "path";

export async function POST(context: APIContext): Promise<Response> {
    if (
        context.request.headers.get("authorization") != `Bearer ${ENV.API_KEY}`
    ) {
        return new Response("Incorrect API key", { status: 401 });
    }

    try {
        const formData = await context.request.formData();
        const uploads = [];

        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                // Extract the file path from the corresponding `path` field
                const path = formData.get(`${key}_path`);
                if (!path || typeof path !== "string") {
                    throw new Error(
                        `Missing or invalid path for file: ${value.name}`
                    );
                }

                const imageDB = db
                    .prepare("SELECT * FROM image WHERE path = ?")
                    .get(path) as ImageDB;

                if (imageDB) {
                    // return new Response(
                    //     JSON.stringify({
                    //         success: true,
                    //         message: "Image already in database",
                    //     }),
                    //     { status: 200 }
                    // );
                } else {
                    const imageId = crypto.randomBytes(20).toString("hex");
                    db.prepare(
                        "INSERT INTO image (id, path, url) VALUES(?, ?, ?)"
                    ).run(
                        imageId,
                        path,
                        `https://rockit.rockhosting.org/api/image/${imageId}`
                    );
                }

                if (!path?.startsWith("album/")) {
                    return new Response(
                        JSON.stringify({
                            error: "Image path must start with album/",
                        }),
                        { status: 400 }
                    );
                }

                console.log(path);

                // Create the target path
                const filePath = join(ENV.IMAGES_PATH, path);

                // Convert the File object to a Buffer
                const arrayBuffer = await value.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                await mkdir(dirname(filePath), { recursive: true });
                uploads.push(writeFile(filePath, buffer));
            }
        }

        // Wait for all files to finish uploading
        await Promise.all(uploads);

        return new Response(
            JSON.stringify({ message: "Files uploaded successfully!" }),
            { status: 200 }
        );
    } catch (err) {
        console.error(err);
        return new Response(
            JSON.stringify({
                message: "Failed to upload files",
                error: err?.toString(),
            }),
            { status: 500 }
        );
    }
}
