import type { BaseHttp } from "@rockit/shared";
import { expect, it, vi } from "vitest";
import {
    exportFilename,
    resolveExportIds,
} from "../../../packages/shared/src/utils/downloadExport";

it("uses attachment names, UTF-8 names and audio-aware fallbacks", () => {
    expect(
        exportFilename(
            'attachment; filename="Track.mp3"',
            "audio/mpeg",
            "Album"
        )
    ).toBe("Track.mp3");
    expect(
        exportFilename(
            "attachment; filename*=utf-8''Canci%C3%B3n.mp3",
            "audio/mpeg",
            "Album"
        )
    ).toBe("Canción.mp3");
    expect(exportFilename(null, "audio/mpeg", "Album")).toBe("Album.mp3");
    expect(exportFilename(null, "application/zip", "Album")).toBe("Album.zip");
    expect(
        exportFilename(
            'attachment; filename="../track.mp3"',
            "audio/mpeg",
            "Album"
        )
    ).not.toContain("/");
});
it("expands featured IDs to actual media and deduplicates mixed selections", async () => {
    const resolveCollectionQueue = vi.fn(async () => ({
        isOk: () => true,
        result: {
            queue: [
                { media: { type: "song", publicId: "one" } },
                { media: { type: "song", publicId: "two" } },
            ],
        },
    }));
    const http = { resolveCollectionQueue } as unknown as typeof BaseHttp;
    expect(
        await resolveExportIds(
            http,
            ["recent-mix", "one", "album", "featured:liked"],
            () => true
        )
    ).toEqual(["one", "two", "album"]);
    expect(resolveCollectionQueue.mock.calls).toHaveLength(2);
});
it("does not start exporting a featured result after its account changes", async () => {
    let current = true;
    const http = {
        resolveCollectionQueue: async () => {
            current = false;
            return { isOk: () => true, result: { queue: [] } };
        },
    } as unknown as typeof BaseHttp;
    await expect(
        resolveExportIds(http, ["recent-mix"], () => current)
    ).rejects.toThrow("Obsolete");
});

it.each([
    ["audio/mpeg", "Track.mp3"],
    ["application/zip", "Album.zip"],
])(
    "keeps %s attachment metadata through the browser HTTP boundary",
    async (contentType, filename) => {
        const { Http } =
            await import("../../../packages/platform-browser/src/http");
        class ExportHttp extends Http {
            protected static override async baseApiFetchAsync(): Promise<Response> {
                return new Response("payload", {
                    headers: {
                        "Content-Type": contentType,
                        "Content-Disposition": `attachment; filename="${filename}"`,
                    },
                });
            }
        }
        const result = await ExportHttp.downloadBinary(
            "/downloader/download-zip",
            { ids: ["one"], title: "Fallback" }
        );
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.result.filename).toBe(filename);
            expect(result.result.contentType).toBe(contentType);
            expect(await result.result.blob.text()).toBe("payload");
        }
    }
);

it("downloads an APK with an authenticated GET and keeps its attachment name", async () => {
    const { Http } =
        await import("../../../packages/platform-browser/src/http");
    let options: import("@rockit/shared").IApiFetchOptions | undefined;
    class BuildHttp extends Http {
        protected static override async baseApiFetchAsync(
            _path: string,
            request?: import("@rockit/shared").IApiFetchOptions
        ): Promise<Response> {
            options = request;
            return new Response("apk", {
                headers: {
                    "Content-Type": "application/vnd.android.package-archive",
                    "Content-Disposition":
                        "attachment; filename=RockIt-Android-25.apk",
                },
            });
        }
    }
    const result = await BuildHttp.downloadBinary(
        "/admin/builds/android/4/download"
    );
    expect(options?.method).toBe("GET");
    expect(options?.body).toBeUndefined();
    expect(result.isOk()).toBe(true);
    if (result.isOk())
        expect(result.result.filename).toBe("RockIt-Android-25.apk");
});
