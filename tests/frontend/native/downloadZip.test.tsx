import { Http } from "@mobile/lib/http.native";
import { downloadZip } from "@mobile/platform/downloadZip.native";
import { isAvailableAsync, shareAsync } from "expo-sharing";

const mockChunks: Uint8Array[] = [];
const mockDeleted = jest.fn();
jest.mock("@/lib/http", () => ({ Http: { downloadZipResponse: jest.fn() } }));
jest.mock(
    "expo-sharing",
    () => ({
        isAvailableAsync: jest.fn(async () => true),
        shareAsync: jest.fn(async () => {}),
    }),
    { virtual: true }
);
jest.mock(
    "expo-file-system",
    () => ({
        Paths: { cache: "cache" },
        File: class {
            uri = "file:///cache/fixture.zip";
            exists = false;
            create() {
                this.exists = true;
            }
            delete() {
                this.exists = false;
                mockDeleted();
            }
            writableStream() {
                return new WritableStream({
                    write: (value: Uint8Array) => {
                        mockChunks.push(value);
                    },
                });
            }
        },
    }),
    { virtual: true }
);
beforeEach(() => {
    jest.clearAllMocks();
    mockChunks.length = 0;
    jest.mocked(isAvailableAsync).mockResolvedValue(true);
});
it("streams the authenticated archive into a temporary file, shares it and removes it", async () => {
    jest.mocked(Http.downloadZipResponse).mockResolvedValue(
        new Response(new Uint8Array([80, 75, 3, 4]), {
            headers: { "content-type": "application/zip" },
        })
    );
    await downloadZip(
        ["album-1", "playlist-1"],
        "RockIt",
        new AbortController().signal,
        () => true
    );
    expect(mockChunks.reduce((n, bytes) => n + bytes.length, 0)).toBe(4);
    expect(shareAsync).toHaveBeenCalledWith(
        "file:///cache/fixture.zip",
        expect.objectContaining({ mimeType: "application/zip" })
    );
    expect(mockDeleted).toHaveBeenCalledTimes(1);
});
it("never shares a late archive after the session changes", async () => {
    jest.mocked(Http.downloadZipResponse).mockResolvedValue(
        new Response("PK", { headers: { "content-type": "application/zip" } })
    );
    await downloadZip(
        ["album-1"],
        "RockIt",
        new AbortController().signal,
        () => false
    );
    expect(shareAsync).not.toHaveBeenCalled();
    expect(mockChunks).toHaveLength(0);
});
it("rejects backend errors without creating or sharing an archive", async () => {
    jest.mocked(Http.downloadZipResponse).mockResolvedValue(
        new Response("failed", { status: 503 })
    );
    await expect(
        downloadZip(
            ["album-1"],
            "RockIt",
            new AbortController().signal,
            () => true
        )
    ).rejects.toThrow();
    expect(shareAsync).not.toHaveBeenCalled();
    expect(mockChunks).toHaveLength(0);
});

it("removes a partial archive and never shares it when cancelled during transfer", async () => {
    const abort = new AbortController();
    const body = new ReadableStream({
        start(controller) {
            controller.enqueue(new Uint8Array([80, 75]));
        },
    });
    jest.mocked(Http.downloadZipResponse).mockResolvedValue(
        new Response(body, { headers: { "content-type": "application/zip" } })
    );
    const pending = downloadZip(
        ["album-1"],
        "RockIt",
        abort.signal,
        () => true
    );
    setTimeout(() => abort.abort(), 0);
    await expect(pending).rejects.toThrow();
    expect(shareAsync).not.toHaveBeenCalled();
    expect(mockDeleted).toHaveBeenCalledTimes(1);
});
