import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { db } from "@/lib/db/db";
import { ImageDB } from "@/lib/db/image";
import path from "path";
import { ENV } from "@/rockitEnv";
import sharp from "sharp";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;


    // Match base ID and dimensions
    const match = id.match(/^([a-zA-Z0-9.-]+)(?:[_-](\d+)[x_](\d+))?$/);

    if (!match) {
        return new NextResponse("Invalid image ID format", { status: 400 });
    }

    const baseId = match[1];
    const width = match[2] ? parseInt(match[2]) : null;
    const height = match[3] ? parseInt(match[3]) : null;

    if (baseId.endsWith(".png")) {
        // Get the image from public folder
        const imagePath = path.join("public/", baseId);
        try {
            const imageExists = fs.existsSync(imagePath);
            if (!imageExists) {
                return new NextResponse("Image file not found", {
                    status: 404,
                });
            }

            const image = fs.createReadStream(imagePath);
            const contentType = "image/png"; // optionally detect based on imageDB.path extension

            const readableStream = new ReadableStream({
                start(controller) {
                    image.on(
                        "data",
                        (chunk: Buffer<ArrayBufferLike> | string) => {
                            try {
                                controller.enqueue(chunk);
                            } catch {
                                image.destroy();
                            }
                        }
                    );

                    image.on("end", () => {
                        controller.close();
                    });

                    image.on("error", (err: object) => {
                        controller.error(err);
                    });
                },
                cancel() {
                    image.destroy();
                },
            });

            return new NextResponse(readableStream, {
                headers: {
                    "Content-Type": contentType,
                    "Content-Disposition": "inline",
                    // No "Content-Length" because resized content may differ
                    "Cache-Control": "public, max-age=2592000, immutable",
                },
            });
        } catch (error) {
            return new NextResponse(
                `Error processing image: ${error?.toString()}`,
                {
                    status: 500,
                }
            );
        }
    }



    const imageDB = db
        .prepare("SELECT * FROM image WHERE id = ?")
        .get(baseId) as ImageDB;

    if (!imageDB) {
        return new NextResponse("Image not found", { status: 404 });
    }

    const imagePath = path.join(ENV.IMAGES_PATH, imageDB.path);

    try {
        const imageExists = fs.existsSync(imagePath);
        if (!imageExists) {
            return new NextResponse("Image file not found", { status: 404 });
        }

        // Create readable stream with resizing if needed
        const image = fs.createReadStream(imagePath);
        const transformer =
            width && height ? sharp().resize(width, height) : null;

        const stream = transformer ? image.pipe(transformer) : image;

        const contentType = "image/png"; // optionally detect based on imageDB.path extension

        const readableStream = new ReadableStream({
            start(controller) {
                stream.on("data", (chunk: Buffer<ArrayBufferLike> | string) => {
                    try {
                        controller.enqueue(chunk);
                    } catch {
                        stream.destroy();
                    }
                });

                stream.on("end", () => {
                    controller.close();
                });

                stream.on("error", (err: object) => {
                    controller.error(err);
                });
            },
            cancel() {
                stream.destroy();
            },
        });

        return new NextResponse(readableStream, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": "inline",
                // No "Content-Length" because resized content may differ
                "Cache-Control": "public, max-age=2592000, immutable",
            },
        });
    } catch (error) {
        return new NextResponse(
            `Error processing image: ${error?.toString()}`,
            {
                status: 500,
            }
        );
    }
}
