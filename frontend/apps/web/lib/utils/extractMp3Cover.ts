import type { EmbeddedPicture } from "@/models/upload";

const MAX_TAG_SIZE = 16 * 1024 * 1024;

function readSize(
    bytes: Uint8Array,
    offset: number,
    length: number,
    syncSafe = false
): number {
    let size = 0;
    for (let i = 0; i < length; i++) {
        if (syncSafe && bytes[offset + i] > 127) return -1;
        size = size * (syncSafe ? 128 : 256) + bytes[offset + i];
    }
    return size;
}

function deunsynchronize(bytes: Uint8Array): Uint8Array {
    return bytes.filter(
        (byte, index) => !(byte === 0 && index > 0 && bytes[index - 1] === 255)
    );
}

function readPicture(
    bytes: Uint8Array,
    legacy: boolean
): EmbeddedPicture | null {
    const encoding = bytes[0];
    let offset = legacy ? 4 : bytes.indexOf(0, 1) + 1;
    if (offset < 2 || offset >= bytes.length) return null;
    const pictureType = bytes[offset++];
    const wide = encoding === 1 || encoding === 2;
    // The description terminator must be aligned to a UTF-16 code unit.
    while (offset < bytes.length) {
        if (bytes[offset] === 0 && (!wide || bytes[offset + 1] === 0)) {
            offset += wide ? 2 : 1;
            break;
        }
        offset += wide ? 2 : 1;
    }
    const data = bytes.slice(offset);
    // Identify actual image bytes; linked pictures and unsupported formats are ignored.
    const mime =
        data[0] === 255 && data[1] === 216 && data[2] === 255
            ? "image/jpeg"
            : data[0] === 137 &&
                data[1] === 80 &&
                data[2] === 78 &&
                data[3] === 71
              ? "image/png"
              : String.fromCharCode(...data.slice(0, 4)) === "RIFF" &&
                  String.fromCharCode(...data.slice(8, 12)) === "WEBP"
                ? "image/webp"
                : null;
    if (!mime) return null;
    const extension = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
    return {
        file: new File([new Uint8Array(data)], `cover.${extension}`, {
            type: mime,
        }),
        front: pictureType === 3,
    };
}

/** Read an embedded ID3 picture without loading the audio into memory. */
export async function extractMp3Cover(file: File): Promise<File | null> {
    if (!/\.mp3$/i.test(file.name)) return null;
    try {
        const header = new Uint8Array(await file.slice(0, 10).arrayBuffer());
        if (
            header.length < 10 ||
            String.fromCharCode(...header.slice(0, 3)) !== "ID3"
        )
            return null;
        const version = header[3];
        if (version < 2 || version > 4) return null;
        // ID3v2.2 tag compression is not supported.
        if (version === 2 && header[5] & 0x40) return null;
        const size = readSize(header, 6, 4, true);
        if (size < 0 || size > MAX_TAG_SIZE || size + 10 > file.size)
            return null;
        let tag: Uint8Array = new Uint8Array(
            await file.slice(10, 10 + size).arrayBuffer()
        );
        if (version < 4 && header[5] & 0x80) tag = deunsynchronize(tag);
        let offset = 0;
        if (version >= 3 && header[5] & 0x40) {
            if (tag.length < 4) return null;
            const extendedSize = readSize(tag, 0, 4, version === 4);
            if (extendedSize < 6) return null;
            offset = extendedSize + (version === 3 ? 4 : 0);
        }
        let fallback: File | null = null;
        const headerSize = version === 2 ? 6 : 10;
        while (offset + headerSize <= tag.length) {
            const idLength = version === 2 ? 3 : 4;
            const id = String.fromCharCode(
                ...tag.slice(offset, offset + idLength)
            );
            if (!/^[A-Z0-9]+$/.test(id)) break;
            const frameSize = readSize(
                tag,
                offset + idLength,
                version === 2 ? 3 : 4,
                version === 4
            );
            const start = offset + headerSize;
            const end = start + frameSize;
            if (frameSize <= 0 || end > tag.length) break;
            if (id === "APIC" || id === "PIC") {
                const flags = version === 2 ? 0 : tag[offset + 9];
                const unsupported = version === 3 ? flags & 0xc0 : flags & 0x0c;
                if (!unsupported) {
                    let picture: Uint8Array = tag.slice(start, end);
                    if (version === 4 && (header[5] & 0x80 || flags & 0x02))
                        picture = deunsynchronize(picture);
                    if (
                        (version === 3 && flags & 0x20) ||
                        (version === 4 && flags & 0x40)
                    )
                        picture = picture.slice(1);
                    if (version === 4 && flags & 0x01)
                        picture = picture.slice(4);
                    const result = readPicture(picture, version === 2);
                    if (result?.front) return result.file;
                    fallback ??= result?.file ?? null;
                }
            }
            offset = end;
        }
        return fallback;
    } catch {
        // Missing or damaged tags should never prevent uploading the audio.
        return null;
    }
}
