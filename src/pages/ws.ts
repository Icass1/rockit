import { db } from "@/lib/db/db";
import { parseUser, type RawUserDB, type UserDB } from "@/lib/db/user";
import type { APIContext } from "astro";

export interface Message {
    currentSong?: string;
    currentTime?: number;
    queue?: string[];
    queueIndex?: number;
    songEnded?: string;
    volume?: number;
    randomQueue?: "1" | "0";
    deviceName?: string;
    repeatSong?: "1" | "0";
    currentStation?: string;
}

let allConections: {
    [key: string]: {
        connections: {
            socket: WebSocket | undefined;
            deviceName?: string | undefined;
        }[];
        playing: WebSocket | undefined;
    };
} = {};

export async function ALL(context: APIContext): Promise<Response> {
    try {
        if (context.request.headers.has("Upgrade")) {
            const { socket, response } =
                await context.locals.upgradeWebSocket();
            if (!context.locals.user) {
                console.log("User is not logged in");
                return new Response("User is not logged in", { status: 401 });
            }

            const userId = context.locals.user.id;

            if (allConections[userId]) {
                allConections[userId].connections?.push({ socket });
                if (allConections[userId].connections.length == 1) {
                    allConections[userId].playing = socket;
                    // console.log("allConections[userId].playing = socket");
                }
            } else {
                allConections[userId] = {
                    connections: [{ socket }],
                    playing: socket,
                };
            }

            // console.log("New client", {
            //     userName: context.locals.user.username,
            //     connections: allConections[userId].connections.length,
            // });

            socket.addEventListener("message", (event) => {
                if (!context.locals.user) {
                    console.error("User is not logged in");
                    return;
                }
                let messageJson: Message;
                try {
                    messageJson = JSON.parse(event.data);
                } catch {
                    console.log("Unable to parse socket message", event.data);
                    return;
                }
                if (messageJson.currentSong != undefined) {
                    db.prepare(
                        `UPDATE user SET currentSong = ? WHERE id = ?`
                    ).run(
                        messageJson.currentSong == ""
                            ? undefined
                            : messageJson.currentSong,
                        userId
                    );
                    db.prepare(
                        `UPDATE user SET currentStation = ? WHERE id = ?`
                    ).run(undefined, userId);
                } else if (messageJson.currentStation != undefined) {
                    db.prepare(
                        `UPDATE user SET currentStation = ? WHERE id = ?`
                    ).run(messageJson.currentStation, userId);
                    db.prepare(
                        `UPDATE user SET currentSong = ? WHERE id = ?`
                    ).run(undefined, userId);
                } else if (messageJson.currentTime != undefined) {
                    if (allConections[userId].playing == socket) {
                        allConections[userId].connections
                            ?.filter((conn) => conn.socket != socket)
                            .map((conn) =>
                                conn?.socket?.send(JSON.stringify(messageJson))
                            );

                        db.prepare(
                            `UPDATE user SET currentTime = ? WHERE id = ?`
                        ).run(messageJson.currentTime, userId);
                    }
                } else if (messageJson.deviceName != undefined) {
                    // Handle device name
                } else if (messageJson.queue != undefined) {
                    db.prepare(`UPDATE user SET queue = ? WHERE id = ?`).run(
                        JSON.stringify(messageJson.queue),
                        userId
                    );
                } else if (messageJson.volume != undefined) {
                    db.prepare(`UPDATE user SET volume = ? WHERE id = ?`).run(
                        messageJson.volume,
                        userId
                    );
                } else if (messageJson.queueIndex != undefined) {
                    db.prepare(
                        `UPDATE user SET queueIndex = ? WHERE id = ?`
                    ).run(messageJson.queueIndex, userId);
                } else if (messageJson.randomQueue != undefined) {
                    db.prepare(
                        `UPDATE user SET randomQueue = ? WHERE id = ?`
                    ).run(messageJson.randomQueue, userId);
                } else if (messageJson.repeatSong != undefined) {
                    db.prepare(
                        `UPDATE user SET repeatSong = ? WHERE id = ?`
                    ).run(messageJson.repeatSong, userId);
                } else if (messageJson.songEnded != undefined) {
                    let userLastPlayedSong = (
                        parseUser(
                            db
                                .prepare(
                                    "SELECT lastPlayedSong FROM user WHERE id = ?"
                                )
                                .get(userId) as RawUserDB
                        ) as UserDB<"lastPlayedSong">
                    ).lastPlayedSong;

                    if (!userLastPlayedSong) {
                        userLastPlayedSong = {};
                    }

                    if (userLastPlayedSong[messageJson.songEnded]) {
                        userLastPlayedSong[messageJson.songEnded].push(
                            new Date().getTime()
                        );
                    } else {
                        userLastPlayedSong[messageJson.songEnded] = [
                            new Date().getTime(),
                        ];
                    }

                    db.prepare(
                        `UPDATE user SET lastPlayedSong = ? WHERE id = ?`
                    ).run(JSON.stringify(userLastPlayedSong), userId);
                } else {
                    console.log("Unknow parameter from socket", messageJson);
                }
            });
            socket.addEventListener("close", () => {
                if (!context.locals.user) {
                    console.error("User is not logged in");
                    return;
                }

                allConections[userId].connections = allConections[
                    userId
                ].connections?.filter((conn) => conn.socket != socket);
            });
            // console.log("Web socket", context.locals.user);
            return response;
        }
        return new Response("New");
    } catch (error) {
        console.error("Error in ws.ts", error?.toString());
        return new Response("Error in web socket");
    }
}
