export class WebSocketManager {
    webSocket?: WebSocket;
    constructor() {
        if (typeof window === "undefined") return;
    }
    async init(BACKEND_URL: string) {
        console.log("WebSocketManager.init");
        this.webSocket = new WebSocket(`${BACKEND_URL}/ws`);
        console.log(this.webSocket);
    }

    send(message: object) {
        if (!this.webSocket) return;

        this.webSocket.send(JSON.stringify(message));
    }
}
