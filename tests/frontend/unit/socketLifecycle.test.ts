import { WebSocketManager } from "@mobile/lib/webSocketManager";
import { afterEach, expect, it, vi } from "vitest";

const port = vi.hoisted(() => ({ createSocket: vi.fn() }));
vi.mock("@/platform/socket", () => port);

afterEach(() => {
    vi.useRealTimers();
    port.createSocket.mockReset();
});
it("closes a socket whose async credentials resolve after logout and never reconnects", async () => {
    vi.useFakeTimers();
    let release!: (socket: unknown) => void;
    port.createSocket.mockReturnValueOnce(
        new Promise((resolve) => {
            release = resolve;
        })
    );
    const manager = new WebSocketManager();
    const pending = manager.init();
    manager.stop();
    const socket = { close: vi.fn() };
    release(socket);
    await pending;
    await vi.advanceTimersByTimeAsync(30000);
    expect(socket.close).toHaveBeenCalledOnce();
    expect(port.createSocket).toHaveBeenCalledOnce();
});
it("cancels a scheduled reconnect and discards old playback when stopped", async () => {
    vi.useFakeTimers();
    port.createSocket.mockRejectedValue(new Error("offline"));
    const manager = new WebSocketManager();
    await manager.init();
    manager.stop();
    await manager.send({ type: "seek" });
    await vi.advanceTimersByTimeAsync(30000);
    expect(port.createSocket).toHaveBeenCalledOnce();
    expect(manager.isConnected).toBe(false);
});
