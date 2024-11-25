import type { APIContext } from "astro";
import { db, parseSong, type ImageDB, type RawSongDB } from "@/lib/db";
import { readFile } from "fs/promises";
import { extname, join } from "path";

const IMAGES_PATH = process.env.IMAGES_PATH;

export async function GET(context: APIContext): Promise<Response> {
    console.log(context.params.id);

    const imageDB = db
        .prepare("SELECT path FROM image WHERE id = ?")
        .get(context.params.id) as ImageDB;

    if (!imageDB) {
        return new Response("Image not found", { status: 404 });
    }
    if (!IMAGES_PATH) {
        return new Response("IMAGES_PATH is not set", { status: 500 });
    }
    try {
        // Join the path segments to form the full file path
        const filePath = join(IMAGES_PATH, imageDB.path);

        // Ensure the file is a PNG
        if (extname(filePath).toLowerCase() !== ".png") {
            return new Response("Only PNG files are supported", {
                status: 400,
            });
        }

        // Read the image file
        const fileBuffer = await readFile(filePath);

        // Return the image with proper headers
        return new Response(fileBuffer, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=3600", // Optional: Caching header
            },
        });
    } catch (error) {
        console.error("Error reading image file:", error);
        return new Response("Image not found or cannot be read", {
            status: 404,
        });
    }
}
