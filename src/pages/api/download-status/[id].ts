import type { APIContext } from "astro";
const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(context: APIContext): Promise<Response> {
    if (!context.locals.user) {
        return new Response("Unauthenticated", { status: 401 });
    }

    const upstreamUrl =
        `${BACKEND_URL}/download-status/` +
        context.params.id +
        `?user=${context.locals.user.id}`;

    // Connect to the upstream SSE server
    const upstreamResponse: Response = await fetch(upstreamUrl, {
        headers: {
            // Add any necessary headers for the upstream connection
        },
    });

    if (!upstreamResponse.ok) {
        return new Response("Failed to connect to upstream server", {
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
    return new Response(customReadable, {
        headers: {
            Connection: "keep-alive",
            "Content-Encoding": "none",
            "Cache-Control": "no-cache, no-transform",
            "Content-Type": "text/event-stream; charset=utf-8",
        },
    });
}
