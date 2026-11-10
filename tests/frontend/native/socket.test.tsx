import { createSocket } from "@mobile/platform/socket.native";
import { getSessionCookie, refreshSessionFromBackend } from "@/lib/api";

jest.mock("@/lib/api", () => ({
    getSessionCookie: jest.fn(),
    refreshSessionFromBackend: jest.fn(),
}));

const original = global.WebSocket;
afterEach(() => {
    global.WebSocket = original;
    jest.resetAllMocks();
});

it("attaches only the native session to the native transport", async () => {
    jest.mocked(getSessionCookie).mockResolvedValue("fixture-session");
    const Socket = jest.fn();
    global.WebSocket = Socket as unknown as typeof WebSocket;
    await createSocket("wss://fixture.invalid/ws");
    expect(Socket).toHaveBeenCalledWith("wss://fixture.invalid/ws", undefined, {
        headers: { Cookie: "session_id=fixture-session" },
    });
    expect(refreshSessionFromBackend).not.toHaveBeenCalled();
});

it("does not open an unauthenticated native socket when session recovery fails", async () => {
    jest.mocked(getSessionCookie).mockResolvedValue(null);
    jest.mocked(refreshSessionFromBackend).mockResolvedValue(null);
    const Socket = jest.fn();
    global.WebSocket = Socket as unknown as typeof WebSocket;
    await expect(createSocket("wss://fixture.invalid/ws")).rejects.toThrow(
        "Session unavailable"
    );
    expect(Socket).not.toHaveBeenCalled();
});
