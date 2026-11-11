import {
    getSessionCookie,
    saveSessionCookieValue,
} from "@mobile/lib/api.native";
import { Http } from "@mobile/lib/http.native";

jest.mock(
    "expo-secure-store",
    () => {
        const values = new Map<string, string>();
        return {
            getItemAsync: jest.fn(
                async (key: string) => values.get(key) ?? null
            ),
            setItemAsync: jest.fn(async (key: string, value: string) => {
                values.set(key, value);
            }),
            deleteItemAsync: jest.fn(async (key: string) => {
                values.delete(key);
            }),
        };
    },
    { virtual: true }
);
jest.mock(
    "expo-crypto",
    () => ({
        CryptoDigestAlgorithm: { SHA256: "SHA256" },
        digestStringAsync: async (_algorithm: string, value: string) =>
            require("node:crypto")
                .createHash("sha256")
                .update(value)
                .digest("hex"),
    }),
    { virtual: true }
);
jest.mock(
    "expo-file-system",
    () => {
        const records = new Map<string, string>();
        class Directory {
            uri: string;
            constructor(...parts: Array<string | { uri: string }>) {
                this.uri = parts
                    .map((value) =>
                        typeof value === "string" ? value : value.uri
                    )
                    .join("/");
            }
            get exists() {
                return [...records.keys()].some((key) =>
                    key.startsWith(this.uri + "/")
                );
            }
            create() {}
            delete() {
                for (const key of records.keys())
                    if (key.startsWith(this.uri + "/")) records.delete(key);
            }
            list() {
                return [...records.keys()]
                    .filter((key) => key.startsWith(this.uri + "/"))
                    .map((key) => new File(key));
            }
        }
        class File extends Directory {
            get name() {
                return this.uri.split("/").at(-1)!;
            }
            get exists() {
                return records.has(this.uri);
            }
            get modificationTime() {
                return Date.now();
            }
            write(value: string) {
                records.set(this.uri, value);
            }
            async text() {
                return records.get(this.uri)!;
            }
            delete() {
                records.delete(this.uri);
            }
        }
        return { Directory, File, Paths: { document: "file://fixture" } };
    },
    { virtual: true }
);
const transport = jest.fn();
const online = (value: unknown, status = 200, headers?: HeadersInit) =>
    transport.mockResolvedValue(
        new Response(JSON.stringify(value), { status, headers })
    );
beforeEach(() => {
    global.fetch = transport;
    transport.mockReset();
});
const session = (username: string) => ({
    username,
    image: "",
    admin: false,
    queueType: "SORTED",
    repeatMode: "OFF",
    currentTimeMs: null,
});
const library = {
    albums: [],
    playlists: [],
    songs: [],
    videos: [],
    stations: [],
    shared: [],
};
it("replays private metadata on a network failure but never after switching account or receiving 401", async () => {
    await saveSessionCookieValue("account-a");
    online(session("alice"));
    expect((await Http.getSession()).isOk()).toBe(true);
    online(library);
    expect((await Http.getUserLibraryMedias()).isOk()).toBe(true);
    transport.mockRejectedValue(new TypeError("offline"));
    expect((await Http.getUserLibraryMedias()).isOk()).toBe(true);
    await saveSessionCookieValue("account-b");
    expect((await Http.getUserLibraryMedias()).isOk()).toBe(false);
    online(session("bob"));
    await Http.getSession();
    online({ detail: "expired" }, 401);
    expect((await Http.getUserLibraryMedias()).code).toBe(401);
    expect(await getSessionCookie()).toBeNull();
    transport.mockRejectedValue(new TypeError("offline"));
    expect((await Http.getSession()).isOk()).toBe(false);
});
it("does not restore an obsolete session cookie when a previous account request finishes late", async () => {
    await saveSessionCookieValue("old-account");
    let finish!: (value: Response) => void;
    let started!: () => void;
    const requested = new Promise<void>((resolve) => {
        started = resolve;
    });
    transport.mockImplementationOnce(
        () =>
            new Promise<Response>((resolve) => {
                finish = resolve;
                started();
            })
    );
    const pending = Http.getSession();
    await requested;
    await saveSessionCookieValue("new-account");
    finish(
        new Response(JSON.stringify(session("old")), {
            headers: { "set-cookie": "session_id=old-account; HttpOnly" },
        })
    );
    await pending;
    expect(await getSessionCookie()).toBe("new-account");
});

it("lets the native transport supply the multipart boundary while preserving authentication", async () => {
    await saveSessionCookieValue("photo-account");
    online({});
    const photo = {
        uri: "file:///gallery/photo.jpg",
        name: "photo.jpg",
        type: "image/jpeg",
    } as unknown as Blob;
    const original = global.FormData;
    // Exercise RN's URI-descriptor transport, rather than Node's Blob-only polyfill.
    global.FormData =
        require("react-native/Libraries/Network/FormData").default;
    try {
        await Http.uploadProfileImage(photo, "photo.jpg");
        const [, request] = transport.mock.calls.at(-1)!;
        expect(request.body).toBeInstanceOf(FormData);
        expect(new Headers(request.headers).has("content-type")).toBe(false);
        expect(new Headers(request.headers).get("cookie")).toContain(
            "photo-account"
        );
    } finally {
        global.FormData = original;
    }
});
