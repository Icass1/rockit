/* eslint @typescript-eslint/explicit-function-return-type: "off" -- Node runs this JavaScript test directly. */
import assert from "node:assert/strict";
import test from "node:test";

const { extractMp3Cover } = await import(
    new URL("../lib/utils/extractMp3Cover.ts", import.meta.url)
);
const jpeg = Buffer.from([255, 216, 255, 224, 1, 2, 3]);
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function sizeBytes(size, syncSafe = false, length = 4) {
    const bytes = Buffer.alloc(length);
    for (let i = length - 1; i >= 0; i--) {
        bytes[i] = size % (syncSafe ? 128 : 256);
        size = Math.floor(size / (syncSafe ? 128 : 256));
    }
    return bytes;
}

function picture(version, data = jpeg, type = 3, wide = false) {
    const body = Buffer.concat([
        Buffer.from([wide ? 1 : 0]),
        version === 2 ? Buffer.from("JPG") : Buffer.from("image/jpeg\0"),
        Buffer.from([type]),
        wide
            ? Buffer.from([255, 254, 65, 0, 0, 0])
            : Buffer.from("description\0"),
        data,
    ]);
    return Buffer.concat([
        Buffer.from(version === 2 ? "PIC" : "APIC"),
        sizeBytes(body.length, version === 4, version === 2 ? 3 : 4),
        version === 2 ? Buffer.alloc(0) : Buffer.alloc(2),
        body,
    ]);
}

function mp3(version, frames, flags = 0) {
    const tag = Buffer.concat(frames);
    return new File(
        [
            Buffer.concat([
                Buffer.from([73, 68, 51, version, 0, flags]),
                sizeBytes(tag.length, true),
                tag,
            ]),
        ],
        "song.mp3"
    );
}

for (const version of [2, 3, 4]) {
    test(`extracts ID3v2.${version} artwork with the original bytes`, async () => {
        const cover = await extractMp3Cover(mp3(version, [picture(version)]));
        assert.equal(cover.type, "image/jpeg");
        assert.equal(cover.name, "cover.jpg");
        assert.deepEqual(Buffer.from(await cover.arrayBuffer()), jpeg);
    });
}

test("prefers the front cover over other pictures and reads UTF-16 descriptions", async () => {
    const cover = await extractMp3Cover(
        mp3(3, [picture(3, jpeg, 0), picture(3, png, 3, true)])
    );
    assert.equal(cover.type, "image/png");
    assert.deepEqual(Buffer.from(await cover.arrayBuffer()), png);
});

test("falls back to another embedded picture when no front cover exists", async () => {
    assert.ok(await extractMp3Cover(mp3(4, [picture(4, jpeg, 0)])));
});

test("handles tag-level unsynchronization", async () => {
    const frame = picture(3);
    const encoded = Buffer.from(
        [...frame].flatMap((byte) => (byte === 255 ? [255, 0] : [byte]))
    );
    const cover = await extractMp3Cover(mp3(3, [encoded], 0x80));
    assert.deepEqual(Buffer.from(await cover.arrayBuffer()), jpeg);
});

test("skips extended headers", async () => {
    for (const version of [3, 4]) {
        const extended =
            version === 3
                ? Buffer.concat([sizeBytes(6), Buffer.alloc(6)])
                : Buffer.concat([sizeBytes(6, true), Buffer.alloc(2)]);
        assert.ok(
            await extractMp3Cover(
                mp3(version, [extended, picture(version)], 0x40)
            )
        );
    }
});

test("ignores absent, unsupported, truncated and oversized tags", async () => {
    const files = [
        new File(["audio"], "song.mp3"),
        new File(["audio"], "song.flac"),
        mp3(3, []),
        mp3(5, [picture(3)]),
        mp3(3, [picture(3, Buffer.from("invalid image"))]),
        new File(
            [Buffer.from([73, 68, 51, 3, 0, 0]), sizeBytes(200, true)],
            "bad.mp3"
        ),
        new File(
            [
                Buffer.from([73, 68, 51, 3, 0, 0]),
                sizeBytes(17 * 1024 * 1024, true),
            ],
            "big.mp3"
        ),
    ];
    for (const file of files) assert.equal(await extractMp3Cover(file), null);
});
