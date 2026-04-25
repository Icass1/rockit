import { BaseArtistResponse } from "@rockit/shared";
import { mediaStorage } from "@/lib/storage/mediaStorage";
import { getDb } from "../db";
import { type Artist } from "../schema";

const now = () => Math.floor(Date.now() / 1000);

export async function getArtistByPublicId(
    publicId: string
): Promise<Artist | null> {
    const db = getDb();
    const result = db.getFirstSync<Artist>(
        "SELECT * FROM artists WHERE public_id = ?",
        publicId
    );
    return result ?? null;
}

export async function upsertArtist(
    artist: BaseArtistResponse
): Promise<Artist> {
    const db = getDb();
    const existing = await getArtistByPublicId(artist.publicId);
    const timestamp = now();

    if (existing) {
        db.runSync(
            `UPDATE artists SET name = ?, image_url = ?, provider = ?, url = ?, provider_url = ?, date_updated = ?
             WHERE public_id = ?`,
            artist.name,
            artist.imageUrl,
            artist.provider,
            artist.url,
            artist.providerUrl,
            timestamp,
            artist.publicId
        );
        return { ...existing, name: artist.name, imageUrl: artist.imageUrl };
    }

    const result = db.runSync(
        `INSERT INTO artists (public_id, name, image_url, provider, url, provider_url, date_updated, date_added)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        artist.publicId,
        artist.name,
        artist.imageUrl,
        artist.provider,
        artist.url,
        artist.providerUrl,
        timestamp,
        timestamp
    );

    const created: Artist = {
        id: result.lastInsertRowId,
        publicId: artist.publicId,
        name: artist.name,
        imageUrl: artist.imageUrl,
        localImagePath: null,
        provider: artist.provider,
        url: artist.url,
        providerUrl: artist.providerUrl,
        dateUpdated: timestamp,
        dateAdded: timestamp,
    };

    // Download artist image in background
    if (artist.imageUrl) {
        mediaStorage
            .downloadImage(artist.publicId, artist.imageUrl)
            .then((localPath) => {
                if (localPath) {
                    db.runSync(
                        "UPDATE artists SET local_image_path = ? WHERE public_id = ?",
                        localPath,
                        artist.publicId
                    );
                }
            });
    }

    return created;
}

export async function upsertArtists(
    artistList: BaseArtistResponse[]
): Promise<void> {
    await Promise.all(artistList.map(upsertArtist));
}
