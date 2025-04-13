// node src/server.mjs
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3001 });

console.log("WebSocket server started on ws://localhost:3001");

wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("message", (message) => {
        console.log(`Received: ${message}`);
        // Echo the message back to the client
        // ws.send(`Server received: ${message}`);
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });

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
