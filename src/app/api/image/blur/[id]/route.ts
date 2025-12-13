import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ImageDB } from "@/lib/db/image";
import { ENV } from "@/rockitEnv";
import { readFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; // Get the dynamic "id" from the URL

    const imageDB = db
        .prepare("SELECT * FROM image WHERE id = ?")
        .get(id.split("_")[0]) as ImageDB;

    if (!imageDB) {
        return new NextResponse("Image not found", { status: 404 });
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

        const finalImageBuffer = await out.toBuffer();

        return new NextResponse(new Uint8Array(finalImageBuffer), {
            headers: {
                "Content-Type": "image/png",
                "Content-Disposition": "inline",
                "Cache-Control": "public, max-age=2592000, immutable",
            },
        });
    } catch (error) {
        return new NextResponse(`Error reading image ${error?.toString()}`, {
            status: 500,
        });
    }
}
