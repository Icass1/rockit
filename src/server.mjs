// node src/server.mjs
import { WebSocketServer } from "ws";

import sqlite from "better-sqlite3";
const db = sqlite("database/database.db");

const wss = new WebSocketServer({ port: 3001 });

console.log("WebSocket server started on ws://localhost:3001");

const clients = {};

function updateClients(userId) {
    console.log("update clients", clients);
    if (clients[userId]) {
        clients[userId].forEach((client1) => {
            client1.ws.send(
                JSON.stringify({
                    devices: clients[userId].map((client2) => ({
                        deviceName: client2.deviceName,
                        you: client1.ws == client2.ws,
                        audioPlayer: client2.audioPlayer,
                    })),
                })
            );
        });
    } else {
        console.log("Client is no longer present");
    }

    Object.values(clients).forEach((userClients) => {
        userClients.forEach((client) =>
            client.ws.send(
                JSON.stringify({ usersCount: Object.keys(clients).length })
            )
        );
    });
}

wss.on("connection", async (ws, req) => {
    try {
        const response = await fetch(
            process.env.FRONTEND_URL + "/api/validate-session",
            {
                headers: { Cookie: req.headers.cookie },
            }
        );

        const user = await response.json();
        let deviceName = "";

        if (!user) {
            ws.close(4000, "Unauthorized");
            return;
        }

        console.log("New client connected", user.username);

        ws.on("message", (message) => {
            let messageJson;
            try {
                messageJson = JSON.parse(message);

                console.log(
                    `Received from ${user.id}: ${JSON.stringify(messageJson)}`
                );
                if (messageJson.command) {
                    console.log(
                        "Command received from",
                        deviceName,
                        "-",
                        user.username,
                        messageJson.command
                    );
                    if (clients[user.id])
                        clients[user.id].forEach((client) => {
                            if (client.ws != ws) {
                                client.ws.send(
                                    JSON.stringify({
                                        command: messageJson.command,
                                    })
                                );
                            }
                        });
                } else {
                    if (clients[user.id])
                        clients[user.id].forEach((client) => {
                            if (client.ws != ws) {
                                client.ws.send(JSON.stringify(messageJson));
                            }
                        });
                }

                if (messageJson.deviceName != undefined) {
                    deviceName = messageJson.deviceName;
                    if (clients[user.id]) {
                        const userDevicesNames = clients[user.id].map(
                            (client) => client.deviceName
                        );

                        let newDeviceName = deviceName;
                        let index = 1;
                        while (userDevicesNames.includes(newDeviceName)) {
                            newDeviceName = deviceName + ` (${index})`;
                            index++;
                        }

                        deviceName = newDeviceName;

                        const someonePlaying = clients[user.id].some(
                            (client) => client.audioPlayer
                        );

                        clients[user.id].push({
                            ws: ws,
                            deviceName: newDeviceName,
                            audioPlayer: !someonePlaying,
                        });
                        updateClients(user.id);
                    } else {
                        clients[user.id] = [
                            {
                                ws: ws,
                                deviceName: deviceName,
                                audioPlayer: true,
                            },
                        ];
                        updateClients(user.id);
                    }
                } else if (messageJson.setAudioPlayer) {
                    clients[user.id] = clients[user.id].map((client) => {
                        if (client.deviceName == messageJson.setAudioPlayer) {
                            client.audioPlayer = true;
                        } else {
                            client.audioPlayer = false;
                        }
                        return client;
                    });
                    updateClients(user.id);
                } else if (messageJson.currentSong != undefined) {
                    if (clients[user.id])
                        db.prepare(
                            `UPDATE user SET currentSong = ? WHERE id = ?`
                        ).run(
                            messageJson.currentSong == ""
                                ? undefined
                                : messageJson.currentSong,
                            user.id
                        );
                    db.prepare(
                        `UPDATE user SET currentStation = ? WHERE id = ?`
                    ).run(undefined, user.id);
                } else if (messageJson.currentStation != undefined) {
                    db.prepare(
                        `UPDATE user SET currentStation = ? WHERE id = ?`
                    ).run(messageJson.currentStation, user.id);
                    db.prepare(
                        `UPDATE user SET currentSong = ? WHERE id = ?`
                    ).run(undefined, user.id);
                } else if (messageJson.currentTime != undefined) {
                    if (clients[user.id])
                        clients[user.id].forEach((client) => {
                            if (client.ws != ws) {
                                client.ws.send(
                                    JSON.stringify({
                                        currentTime: messageJson.currentTime,
                                    })
                                );
                            }
                        });

                    db.prepare(
                        `UPDATE user SET currentTime = ? WHERE id = ?`
                    ).run(messageJson.currentTime, user.id);
                } else if (messageJson.queue != undefined) {
                    db.prepare(`UPDATE user SET queue = ? WHERE id = ?`).run(
                        JSON.stringify(messageJson.queue),
                        user.id
                    );
                } else if (messageJson.crossFade != undefined) {
                    db.prepare(
                        `UPDATE user SET crossFade = ? WHERE id = ?`
                    ).run(messageJson.crossFade, user.id);
                } else if (messageJson.volume != undefined) {
                    db.prepare(`UPDATE user SET volume = ? WHERE id = ?`).run(
                        messageJson.volume,
                        user.id
                    );
                } else if (messageJson.queueIndex != undefined) {
                    db.prepare(
                        `UPDATE user SET queueIndex = ? WHERE id = ?`
                    ).run(messageJson.queueIndex, user.id);
                } else if (messageJson.randomQueue != undefined) {
                    db.prepare(
                        `UPDATE user SET randomQueue = ? WHERE id = ?`
                    ).run(messageJson.randomQueue, user.id);
                } else if (messageJson.repeatSong != undefined) {
                    db.prepare(
                        `UPDATE user SET repeatSong = ? WHERE id = ?`
                    ).run(messageJson.repeatSong, user.id);
                } else if (messageJson.songEnded != undefined) {
                    let userLastPlayedSong = JSON.parse(
                        db
                            .prepare(
                                "SELECT lastPlayedSong FROM user WHERE id = ?"
                            )
                            .get(user.id).lastPlayedSong
                    );

                    if (!userLastPlayedSong) {
                        userLastPlayedSong = {};
                    }

                    if (userLastPlayedSong[messageJson.songEnded]) {
                        userLastPlayedSong[messageJson.songEnded].push(
                            new Date().toISOString()
                        );
                    } else {
                        userLastPlayedSong[messageJson.songEnded] = [
                            new Date().toISOString(),
                        ];
                    }

                    db.prepare(
                        `UPDATE user SET lastPlayedSong = ? WHERE id = ?`
                    ).run(JSON.stringify(userLastPlayedSong), user.id);
                } else {
                    console.log("Unknow parameter from socket", messageJson);
                }
            } catch {
                console.log("Unable to parse socket message", message);
                return;
            }
        });

        ws.on("close", () => {
            if (!clients[user.id]) {
                return;
            }

            clients[user.id] = clients[user.id].filter(
                (client) => client.ws !== ws
            );

            if (clients[user.id].length == 0) {
                delete clients[user.id];
            }

            updateClients(user.id);

            console.log("Client disconnected", user.username);
        });

        ws.send(JSON.stringify({ message: "validated" }));
        ws.send(JSON.stringify({ usersCount: Object.keys(clients).length }));
    } catch (error) {
        console.error("Error in websocket connection: ", error);
    }
});

// Handle server shutdown gracefully
process.on("SIGINT", () => {
    console.log("Shutting down WebSocket server...");
    wss.clients.forEach((client) => {
        client.close(1001, "Server is shutting down");
    });
    wss.close();
    process.exit();
});
