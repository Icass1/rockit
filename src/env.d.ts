/// <reference path="../.astro/types.d.ts" />
declare namespace App {
    interface Locals {
        session: import("lucia").Session | null;
        user: { username: string; id: string; lang: string; admin: string };
        upgradeWebSocket: () => Promise<{
            socket: WebSocket;
            response: Response;
        }>;
    }
}
