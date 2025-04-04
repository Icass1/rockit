import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { db } from "@/lib/db/db";
import { ImageDB } from "@/lib/db/image";
import path from "path";
import { ENV } from "@/rockitEnv";

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

    const imagePath = path.join(ENV.IMAGES_PATH, imageDB.path);

    try {
        const stat = fs.statSync(imagePath);
        const fileStream = fs.createReadStream(imagePath);

        const readableStream = new ReadableStream({
            start(controller) {
                fileStream.on("data", (chunk) => controller.enqueue(chunk));
                fileStream.on("end", () => controller.close());
                fileStream.on("error", (err) => controller.error(err));
            },
        });

        return new NextResponse(readableStream, {
            headers: {
                "Content-Type": "image/png",
                "Content-Disposition": "inline",
                "Content-Length": stat.size.toString(),
                "Cache-Control": "public, max-age=0, immutable",
            },
        });
    } catch (error) {
        return new NextResponse(`Error reading image ${error?.toString()}`, {
            status: 500,
        });
    }
}
