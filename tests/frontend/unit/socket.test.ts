import { createSocket } from "@mobile/platform/socket.web";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

it("uses the browser cookie jar without native constructor options or token extraction", async () => {
    const Socket = vi.fn(function () {});
    vi.stubGlobal("WebSocket", Socket);
    await createSocket("wss://fixture.invalid/ws");
    expect(Socket).toHaveBeenCalledExactlyOnceWith("wss://fixture.invalid/ws");
});
