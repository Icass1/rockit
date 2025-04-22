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
    const { id } = await params;

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
                const onData = (chunk: Buffer<ArrayBufferLike> | string) => {
                    try {
                        controller.enqueue(chunk);
                    } catch {
                        fileStream.destroy();
                    }
                };

                const onEnd = () => {
                    controller.close();
                    cleanup();
                };

                const onError = (err: object) => {
                    controller.error(err);
                    cleanup();
                };

                const cleanup = () => {
                    fileStream.off("data", onData);
                    fileStream.off("end", onEnd);
                    fileStream.off("error", onError);
                };

                fileStream.on("data", onData);
                fileStream.on("end", onEnd);
                fileStream.on("error", onError);
            },
            cancel() {
                fileStream.destroy();
            },
        });

        return new NextResponse(readableStream, {
            headers: {
                "Content-Type": "image/png",
                "Content-Disposition": "inline",
                "Content-Length": stat.size.toString(),
                "Cache-Control": "public, max-age=2592000, immutable",
            },
        });
    } catch (error) {
        return new NextResponse(`Error reading image: ${error?.toString()}`, {
            status: 500,
        });
    }
}
