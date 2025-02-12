import { db } from "@/lib/db/db";
import type { ImageDB } from "@/lib/db/image";
import { ENV } from "@/rockitEnv";
import type { APIContext } from "astro";
import { readFile } from "fs/promises";
import { extname, join } from "path";
import sharp from "sharp";

const IMAGES_PATH = ENV.IMAGES_PATH;

export async function GET(context: APIContext): Promise<Response> {
    const imageID = context.params.id?.split("_")[0];
    let _imageWidth: string | number | undefined = context.params.id
        ?.split("_")[1]
        ?.split("x")[0];

    let _imageHeight: string | number | undefined = context.params.id
        ?.split("_")[1]
        ?.split("x")[1];

    let imageWidth = _imageWidth
        ? (Number(_imageWidth) as number)
        : (_imageWidth as undefined);
    let imageHeight = _imageHeight
        ? (Number(_imageHeight) as number)
        : (_imageHeight as undefined);

    const imageDB = db
        .prepare("SELECT path FROM image WHERE id = ?")
        .get(imageID) as ImageDB;

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

        // Resize the image if width or height is provided
        let image = sharp(fileBuffer);
        const metadata = await image.metadata();
        if (imageWidth && imageHeight) {
            image = image.resize(
                Math.min(metadata.width ?? 1000, imageWidth),
                Math.min(metadata.height ?? 1000, imageHeight)
            );
        }
        const resizedBuffer = await image.toBuffer();

        // Return the resized image with proper headers
        return new Response(resizedBuffer, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=604800", // Optional: Caching header
            },
        });
    } catch (error) {
        console.error("Error reading image file:", error);
        return new Response("Image not found or cannot be read", {
            status: 404,
        });
    }
}
