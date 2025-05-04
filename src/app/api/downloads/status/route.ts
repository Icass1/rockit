import { getSession } from "@/lib/auth/getSession";
import { ENV } from "@/rockitEnv";
import { NextRequest, NextResponse } from "next/server";
const BACKEND_URL = ENV.BACKEND_URL;

export async function GET(request: NextRequest): Promise<NextResponse> {
    const session = await getSession();

    if (!session?.user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    const url = new URL(request.url);

    if (!url.searchParams.get("id")) {
        return new NextResponse("Missing id", { status: 400 });
    }

    const downloadId = url.searchParams.get("id");

    const upstreamUrl =
        `${BACKEND_URL}/download-status?id=` +
        downloadId +
        `&user=${session.user.id}`;

    // Connect to the upstream SSE server
    const upstreamResponse: Response = await fetch(upstreamUrl, {
        headers: {
            // Add any necessary headers for the upstream connection
        },
    });

    if (!upstreamResponse.ok) {
        return new NextResponse("Failed to connect to upstream server", {
            status: 502,
        });
    }

    // Create a readable stream for the client
    const customReadable = new ReadableStream({
        start(controller) {
            if (!upstreamResponse.body) {
                return;
            }
            const reader = upstreamResponse.body.getReader();

            // Read chunks from the upstream response
            const push = () => {
                reader
                    .read()
                    .then(({ done, value }) => {
                        if (done) {
                            controller.close();
                            return;
                        }

                        // Push the chunk to the client
                        controller.enqueue(value);
                        push();
                    })
                    .catch((err) => {
                        controller.error(err);
                    });
            };
            push();
        },
    });
    // Return the SSE response
    return new NextResponse(customReadable, {
        headers: {
            Connection: "keep-alive",
            "Content-Encoding": "none",
            "Cache-Control": "no-cache, no-transform",
            "Content-Type": "text/event-stream; charset=utf-8",
        },
    });
}
