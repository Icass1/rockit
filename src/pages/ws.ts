import type { APIContext } from "astro";
import { db } from "@/lib/db";

interface Message {
    currentSong?: string
    currentTime?: number
    queue?: string[]
    queueIndex?: number
}

export async function ALL(context: APIContext): Promise<Response> {

    if (context.request.headers.has("Upgrade")) {
        const { socket, response } = await context.locals.upgradeWebSocket();
        socket.addEventListener("message", (event) => {

            if (!context.locals.user) {
                console.log("User is not logged in")
                return
            }

            let messageJson: Message
            try {
                messageJson = JSON.parse(event.data)
            } catch {
                console.log("Unable to parse socket message", event.data)
                return
            }
            if (messageJson.currentSong) {
                db.prepare(`UPDATE user SET currentSong = ? WHERE id = ?`).run(messageJson.currentSong, context.locals.user.id)
            } else if (messageJson.currentTime) {
                db.prepare(`UPDATE user SET currentTime = ? WHERE id = ?`).run(messageJson.currentTime, context.locals.user.id)
            } else if (messageJson.queue) {
                db.prepare(`UPDATE user SET queue = ? WHERE id = ?`).run(JSON.stringify(messageJson.queue), context.locals.user.id)
            } else if (messageJson.queueIndex) {
                db.prepare(`UPDATE user SET queueIndex = ? WHERE id = ?`).run(messageJson.queueIndex, context.locals.user.id)
            } else {
                console.log("Unknow parameter from socket", messageJson)
            }
        });
        socket.addEventListener("close", (event) => {
            console.log("Web socket close", context.locals.user)
        })
        console.log("Web socket", context.locals.user)
        return response;
    }
    return new Response("New")
}