import { db } from "@/lib/db/db";
import type { ImageDB } from "@/lib/db/image";
import { ENV } from "@/rockitEnv";
import type { APIContext } from "astro";
import { readFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";

export async function GET(context: APIContext): Promise<Response> {
    const imageDB = db
        .prepare("SELECT path FROM image WHERE id = ?")
        .get(context.params.id) as ImageDB;

    if (!imageDB) {
        return new Response("Image not found", { status: 404 });
    }

    try {
        const filePath = join(ENV.IMAGES_PATH, imageDB.path);
        const imageBuffer = await readFile(filePath);

        const backgroundImage = sharp({
            create: {
                width: 1600,
                height: 900,
                channels: 3,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
        });

        const image = sharp(imageBuffer);
        const out1 = await backgroundImage
            .composite([
                { input: await image.toBuffer(), top: -100, left: 500 },
            ])
            .png()
            .toBuffer();

        const out = sharp(out1)
            .blur(15)
            .resize({ width: 160, height: 90 })
            .webp();

        return new Response(await out.toBuffer(), {
            headers: {
                "Content-Type": "image/webp",
                "Cache-Control": "public, max-age=2592000", // 60*60*24*30
            },
        });
    } catch (error) {
        console.error("Error processing image:", error);
        return new Response("Error processing image", { status: 500 });
    }
}
