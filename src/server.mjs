// node src/server.mjs
import { WebSocketServer } from "ws";

import sqlite from "better-sqlite3";
const db = sqlite("database/database.db");

const wss = new WebSocketServer({ port: 3001 });

console.log("WebSocket server started on ws://localhost:3001");

function onMessage(userId, json) {
    if (json.currentSong != undefined) {
        db.prepare(`UPDATE user SET currentSong = ? WHERE id = ?`).run(
            json.currentSong == "" ? undefined : json.currentSong,
            userId
        );
        db.prepare(`UPDATE user SET currentStation = ? WHERE id = ?`).run(
            undefined,
            userId
        );
    } else if (json.currentStation != undefined) {
        db.prepare(`UPDATE user SET currentStation = ? WHERE id = ?`).run(
            json.currentStation,
            userId
        );
        db.prepare(`UPDATE user SET currentSong = ? WHERE id = ?`).run(
            undefined,
            userId
        );
    } else if (json.currentTime != undefined) {
        // if (allConections[userId].playing == socket) {
        //     allConections[userId].connections
        //         ?.filter((conn) => conn.socket != socket)
        //         .map((conn) =>
        //             conn?.socket?.send(JSON.stringify(json))
        //         );

        //     db.prepare(
        //         `UPDATE user SET currentTime = ? WHERE id = ?`
        //     ).run(json.currentTime, userId);
        // }
        db.prepare(`UPDATE user SET currentTime = ? WHERE id = ?`).run(
            json.currentTime,
            userId
        );
    } else if (json.deviceName != undefined) {
        // Handle device name
    } else if (json.queue != undefined) {
        db.prepare(`UPDATE user SET queue = ? WHERE id = ?`).run(
            JSON.stringify(json.queue),
            userId
        );
    } else if (json.volume != undefined) {
        db.prepare(`UPDATE user SET volume = ? WHERE id = ?`).run(
            json.volume,
            userId
        );
    } else if (json.queueIndex != undefined) {
        db.prepare(`UPDATE user SET queueIndex = ? WHERE id = ?`).run(
            json.queueIndex,
            userId
        );
    } else if (json.randomQueue != undefined) {
        db.prepare(`UPDATE user SET randomQueue = ? WHERE id = ?`).run(
            json.randomQueue,
            userId
        );
    } else if (json.repeatSong != undefined) {
        db.prepare(`UPDATE user SET repeatSong = ? WHERE id = ?`).run(
            json.repeatSong,
            userId
        );
    } else if (json.songEnded != undefined) {
        let userLastPlayedSong = JSON.parse(
            db
                .prepare("SELECT lastPlayedSong FROM user WHERE id = ?")
                .get(userId).lastPlayedSong
        );

        if (!userLastPlayedSong) {
            userLastPlayedSong = {};
        }

        if (userLastPlayedSong[json.songEnded]) {
            userLastPlayedSong[json.songEnded].push(new Date().toISOString());
        } else {
            userLastPlayedSong[json.songEnded] = [new Date().toISOString()];
        }

        db.prepare(`UPDATE user SET lastPlayedSong = ? WHERE id = ?`).run(
            JSON.stringify(userLastPlayedSong),
            userId
        );
    } else {
        console.log("Unknow parameter from socket", json);
    }

    console.log(`Received from ${userId}: ${json}`);
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

        if (!user) {
            ws.close(4000, "Unauthorized");
            return;
        }

        console.log("New client connected", user.username);

        ws.on("message", (message) => {
            let messageJson;
            try {
                messageJson = JSON.parse(message);
            } catch {
                console.log("Unable to parse socket message", message);
                return;
            }
            try {
                onMessage(user.id, messageJson);
            } catch (error) {
                console.error("Error in message process: ", error);
            }
        });

        ws.on("close", () => {
            console.log("Client disconnected", user.username);
        });
    } catch (error) {
        console.error("Error in websocket connection: ", error);
    }

    // Send welcome message
    // ws.send("Connected to WebSocket server");
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
