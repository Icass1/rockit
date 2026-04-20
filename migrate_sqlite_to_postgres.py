# type: ignore
import json
import os
import sqlite3
import uuid
from datetime import datetime

import asyncpg
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

os.environ["DATABASE_URL"] = (
    "postgresql+asyncpg://admin:admin@rockit.rockhosting.lan:5432/development_10"
)
os.environ["DB_HOST"] = "rockit.rockhosting.lan"
os.environ["DB_USER"] = "admin"
os.environ["DB_PASSWORD"] = "admin"
os.environ["DB_PORT"] = "5432"
os.environ["DB_NAME"] = "development_11"

DB_HOST = "rockit.rockhosting.lan"
DB_USER = "admin"
DB_PASSWORD = "admin"
DB_PORT = 5432
DB_NAME = "development_11"

SPOTIFY_PROVIDER_ID = 2


async def get_connection():
    return await asyncpg.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT,
        database=DB_NAME,
    )


def parse_json_safe(val):
    if val is None or val == "":
        return []
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return []


def parse_date_added(val):
    if not val:
        return datetime.now()
    try:
        return datetime.strptime(val, "%a, %d %b %Y %H:%M:%S %Z")
    except ValueError:
        try:
            return datetime.strptime(val, "%Y-%m-%d")
        except ValueError:
            return datetime.now()


def get_first_image_url(images_json):
    images = parse_json_safe(images_json)
    if images and isinstance(images, list) and len(images) > 0:
        return images[0].get("url")
    return None


async def get_or_create_image(conn, path, image_url, date_added_dt):
    if not image_url:
        return None
    existing = await conn.fetchval(
        "SELECT id FROM core.image WHERE path = $1",
        path,
    )
    if existing:
        return existing
    image_public_id = str(uuid.uuid4())
    image_id = await conn.fetchval(
        """
        INSERT INTO core.image (public_id, url, path, date_added, date_updated)
        VALUES ($1, $2, $3, $4, $4)
        ON CONFLICT (path) DO NOTHING
        RETURNING id
    """,
        image_public_id,
        image_url,
        path,
        date_added_dt,
    )
    return image_id


async def migrate_artists(conn, sqlite_cursor):
    print("Migrating artists...")

    sqlite_cursor.execute(
        "SELECT id, images, name, genres, followers, popularity, type, dateAdded, image FROM artist"
    )
    artists = sqlite_cursor.fetchall()

    for i, row in enumerate(artists):
        (
            spotify_id,
            images,
            name,
            genres,
            followers,
            popularity,
            media_type,
            date_added,
            image,
        ) = row
        public_id = str(uuid.uuid4())
        date_added_dt = parse_date_added(date_added)
        image_url = get_first_image_url(images) or image

        image_id = await get_or_create_image(
            conn, f"/artists/{spotify_id}", image_url, date_added_dt
        )

        media_id = await conn.fetchval(
            """
            INSERT INTO core.media (public_id, provider_id, media_type_key, date_added, date_updated)
            VALUES ($1, $2, $3, $4, $4)
            ON CONFLICT (public_id) DO NOTHING
            RETURNING id
        """,
            public_id,
            SPOTIFY_PROVIDER_ID,
            1,
            date_added_dt,
        )
        if not media_id:
            media_id = await conn.fetchval(
                "SELECT id FROM core.media WHERE public_id = $1",
                public_id,
            )
            if media_id:
                if (i + 1) % 100 == 0:
                    print(f"  Skipped duplicate artist: {name}")
                continue

        await conn.execute(
            """
            INSERT INTO spotify.artist (id, spotify_id, name, followers, popularity, image_id, date_added, date_updated)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (spotify_id) DO NOTHING
        """,
            media_id,
            spotify_id,
            name,
            followers or 0,
            popularity or 0,
            image_id,
        )

        if (i + 1) % 100 == 0:
            print(f"  Processed {i + 1}/{len(artists)} artists")

    print(f"  Migrated {len(artists)} artists")


async def fetch_missing_albums_from_scraper(album_ids):
    print(f"Fetching {len(album_ids)} missing albums from Spotify scraper...")

    from spotify_scraper import browsers, extractors

    browser = browsers.create_browser()
    album_extractor = extractors.AlbumExtractor(browser)

    albums_data = []

    for i, album_id in enumerate(album_ids):
        try:
            print(f"  Fetching album {i+1}/{len(album_ids)}: {album_id}")
            album = album_extractor.extract_by_id(album_id)
            if album:
                albums_data.append(album)
        except Exception as e:
            print(f"    Failed to fetch album {album_id}: {e}")
            continue

    print(f"  Successfully fetched {len(albums_data)} albums")
    return albums_data


async def insert_scraped_album(conn, album_data):
    spotify_id = album_data.get("id")
    if not spotify_id:
        return None

    name = album_data.get("name", "Unknown")
    release_date = album_data.get("release_date", "1970-01-01")
    total_tracks = album_data.get("total_tracks", 1)

    images = album_data.get("images", [])
    image_url = images[0].get("url") if images else None

    date_added_dt = datetime.now()

    image_id = await get_or_create_image(
        conn, f"/albums/{spotify_id}", image_url, date_added_dt
    )

    public_id = str(uuid.uuid4())
    media_id = await conn.fetchval(
        """
        INSERT INTO core.media (public_id, provider_id, media_type_key, date_added, date_updated)
        VALUES ($1, $2, $3, $4, $4)
        ON CONFLICT (public_id) DO NOTHING
        RETURNING id
    """,
        public_id,
        SPOTIFY_PROVIDER_ID,
        2,
        date_added_dt,
    )

    if not media_id:
        media_id = await conn.fetchval(
            "SELECT id FROM core.media WHERE public_id = $1",
            public_id,
        )

    if media_id:
        await conn.execute(
            """
            INSERT INTO spotify.album (id, spotify_id, name, release_date, popularity, disc_count, image_id, date_added, date_updated)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (spotify_id) DO NOTHING
        """,
            media_id,
            spotify_id,
            name,
            release_date,
            0,
            total_tracks,
            image_id,
        )

        existing_id = await conn.fetchval(
            "SELECT id FROM spotify.album WHERE spotify_id = $1",
            spotify_id,
        )
        if existing_id:
            return existing_id
        return media_id

    return None


async def migrate_albums(conn, sqlite_cursor):
    print("Migrating albums...")

    sqlite_cursor.execute(
        "SELECT id, type, images, name, releaseDate, artists, copyrights, popularity, genres, songs, discCount, dateAdded, image FROM album"
    )
    albums = sqlite_cursor.fetchall()

    album_core_id_map = {}

    for i, row in enumerate(albums):
        (
            spotify_id,
            album_type,
            images,
            name,
            release_date,
            artists_json,
            copyrights,
            popularity,
            genres,
            songs_json,
            disc_count,
            date_added,
            image,
        ) = row
        public_id = str(uuid.uuid4())
        date_added_dt = (
            parse_date_added(str(date_added)) if date_added else datetime.now()
        )
        image_url = get_first_image_url(images) or image

        image_id = await get_or_create_image(
            conn, f"/albums/{spotify_id}", image_url, date_added_dt
        )

        media_id = await conn.fetchval(
            """
            INSERT INTO core.media (public_id, provider_id, media_type_key, date_added, date_updated)
            VALUES ($1, $2, $3, $4, $4)
            ON CONFLICT (public_id) DO NOTHING
            RETURNING id
        """,
            public_id,
            SPOTIFY_PROVIDER_ID,
            2,
            date_added_dt,
        )
        if not media_id:
            media_id = await conn.fetchval(
                "SELECT id FROM core.media WHERE public_id = $1",
                public_id,
            )
            if media_id:
                album_core_id_map[spotify_id] = media_id
                if (i + 1) % 100 == 0:
                    print(f"  Skipped duplicate album: {name}")
                continue

        await conn.execute(
            """
            INSERT INTO spotify.album (id, spotify_id, name, release_date, popularity, disc_count, image_id, date_added, date_updated)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (spotify_id) DO NOTHING
        """,
            media_id,
            spotify_id,
            name,
            release_date or "1970-01-01",
            popularity or 0,
            disc_count or 1,
            image_id,
        )

        if spotify_id not in album_core_id_map:
            existing_id = await conn.fetchval(
                "SELECT id FROM spotify.album WHERE spotify_id = $1",
                spotify_id,
            )
            if existing_id:
                album_core_id_map[spotify_id] = existing_id
            else:
                album_core_id_map[spotify_id] = media_id

        if (i + 1) % 100 == 0:
            print(f"  Processed {i + 1}/{len(albums)} albums")

    print(f"  Migrated {len(albums)} albums")
    return album_core_id_map


async def migrate_songs(conn, sqlite_cursor, album_core_id_map):
    print("Migrating songs...")

    sqlite_cursor.execute(
        """SELECT id, name, artists, genres, discNumber, albumName, albumArtist, albumType, albumId, duration, date, trackNumber, publisher, path, images, copyright, downloadUrl, lyrics, popularity, dateAdded, image, dynamicLyrics, isrc FROM song"""
    )
    songs = sqlite_cursor.fetchall()

    missing_album_ids = set()
    for row in songs:
        album_id = row[8]
        if album_id and album_id not in album_core_id_map:
            missing_album_ids.add(album_id)

    print(f"  Found {len(missing_album_ids)} unique missing album IDs")

    if missing_album_ids:
        scraped_albums = await fetch_missing_albums_from_scraper(
            list(missing_album_ids)
        )

        for album_data in scraped_albums:
            album_id = await insert_scraped_album(conn, album_data)
            if album_id:
                spotify_id = album_data.get("id")
                if spotify_id:
                    album_core_id_map[spotify_id] = album_id

    migrated_count = 0
    skipped_count = 0

    for i, row in enumerate(songs):
        (
            spotify_id,
            name,
            artists_json,
            genres,
            disc_number,
            album_name,
            album_artist,
            album_type,
            album_id,
            duration,
            date,
            track_number,
            publisher,
            path,
            images,
            copyright,
            download_url,
            lyrics,
            popularity,
            date_added,
            image,
            dynamic_lyrics,
            isrc,
        ) = row

        public_id = str(uuid.uuid4())
        date_added_dt = (
            parse_date_added(str(date_added)) if date_added else datetime.now()
        )
        image_url = get_first_image_url(images) or image
        image_public_id = str(uuid.uuid4())

        album_core_id = album_core_id_map.get(album_id)
        if not album_core_id:
            album_core_id = await conn.fetchval(
                """
                SELECT a.id FROM spotify.album a
                JOIN core.media m ON m.id = a.id
                WHERE a.spotify_id = $1
                """,
                album_id,
            )
            if album_core_id:
                album_core_id_map[album_id] = album_core_id
        if not album_core_id:
            skipped_count += 1
            if skipped_count <= 5:
                print(
                    f"  Warning: No album found for song {spotify_id} (album_id: {album_id})"
                )
            continue

        image_id = await get_or_create_image(
            conn, f"/songs/{spotify_id}", image_url, date_added_dt
        )

        media_id = await conn.fetchval(
            """
            INSERT INTO core.media (public_id, provider_id, media_type_key, date_added, date_updated)
            VALUES ($1, $2, $3, $4, $4)
            ON CONFLICT (public_id) DO NOTHING
            RETURNING id
        """,
            public_id,
            SPOTIFY_PROVIDER_ID,
            3,
            date_added_dt,
        )
        if not media_id:
            if (i + 1) % 500 == 0:
                print(f"  Skipped duplicate song: {name}")
            continue

        await conn.execute(
            """
            INSERT INTO spotify.track (id, spotify_id, name, duration_ms, track_number, disc_number, popularity, image_id, path, album_id, isrc, download_url, lyrics, dynamic_lyrics, date_added, date_updated)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
            ON CONFLICT (spotify_id) DO NOTHING
        """,
            media_id,
            spotify_id,
            name or "Unknown",
            int(duration * 1000) if duration else 0,
            track_number or 1,
            disc_number or 1,
            popularity or 0,
            image_id,
            path,
            album_core_id,
            isrc if isrc else "",
            download_url,
            lyrics,
            dynamic_lyrics,
        )

        migrated_count += 1

        if (i + 1) % 500 == 0:
            print(
                f"  Processed {i + 1}/{len(songs)} songs (migrated: {migrated_count}, skipped: {skipped_count})"
            )

    print(f"  Migrated {migrated_count} songs, skipped {skipped_count} songs")


async def main():
    print("Starting migration...")

    sqlite_conn = sqlite3.connect("/root/rockit/database.db")
    sqlite_cursor = sqlite_conn.cursor()

    postgres_conn = await get_connection()

    try:
        await migrate_artists(postgres_conn, sqlite_cursor)

        album_core_id_map = await migrate_albums(postgres_conn, sqlite_cursor)

        await migrate_songs(postgres_conn, sqlite_cursor, album_core_id_map)

        await migrate_genres(postgres_conn, sqlite_cursor)

        await migrate_artist_genres(postgres_conn, sqlite_cursor)

        await migrate_copyrights(postgres_conn, sqlite_cursor)

        await migrate_album_copyrights(postgres_conn, sqlite_cursor)

        await migrate_album_artists(postgres_conn, sqlite_cursor)

        await migrate_track_artists(postgres_conn, sqlite_cursor)

        await migrate_external_images(postgres_conn, sqlite_cursor)

        await migrate_album_external_images(postgres_conn, sqlite_cursor)

        await migrate_artist_external_images(postgres_conn, sqlite_cursor)

        print("Migration complete!")

    finally:
        await postgres_conn.close()
        sqlite_conn.close()


async def migrate_genres(conn, sqlite_cursor):
    print("Migrating genres...")

    sqlite_cursor.execute(
        "SELECT DISTINCT genres FROM artist WHERE genres IS NOT NULL AND genres != '[]'"
    )
    all_genres = set()
    for row in sqlite_cursor.fetchall():
        genres = parse_json_safe(row[0])
        for g in genres:
            if g:
                all_genres.add(g.lower())

    for genre_name in all_genres:
        existing = await conn.fetchval(
            "SELECT id FROM spotify.genre WHERE name = $1",
            genre_name,
        )
        if not existing:
            await conn.execute(
                "INSERT INTO spotify.genre (name) VALUES ($1)",
                genre_name,
            )

    print(f"  Migrated {len(all_genres)} genres")


async def migrate_artist_genres(conn, sqlite_cursor):
    print("Migrating artist genres...")

    sqlite_cursor.execute(
        "SELECT id, genres FROM artist WHERE genres IS NOT NULL AND genres != '[]'"
    )
    artists = sqlite_cursor.fetchall()

    count = 0
    for spotify_id, genres_json in artists:
        artist_id = await conn.fetchval(
            "SELECT id FROM spotify.artist WHERE spotify_id = $1",
            spotify_id,
        )
        if not artist_id:
            continue

        genres = parse_json_safe(genres_json)
        for genre_name in genres:
            if not genre_name:
                continue
            genre_id = await conn.fetchval(
                "SELECT id FROM spotify.genre WHERE name = $1",
                genre_name.lower(),
            )
            if genre_id and artist_id:
                existing = await conn.fetchval(
                    "SELECT 1 FROM spotify.artist_genre WHERE artist_id = $1 AND genre_id = $2",
                    artist_id,
                    genre_id,
                )
                if not existing:
                    await conn.execute(
                        "INSERT INTO spotify.artist_genre (artist_id, genre_id) VALUES ($1, $2)",
                        artist_id,
                        genre_id,
                    )
                    count += 1

    print(f"  Migrated {count} artist-genre relations")


async def migrate_copyrights(conn, sqlite_cursor):
    print("Migrating copyrights...")

    sqlite_cursor.execute(
        "SELECT DISTINCT copyrights FROM album WHERE copyrights IS NOT NULL AND copyrights != ''"
    )
    all_copyrights = set()
    for row in sqlite_cursor.fetchall():
        copyrights = parse_json_safe(row[0])
        for cp in copyrights:
            if cp and cp.get("text"):
                all_copyrights.add((cp.get("text", ""), cp.get("type", "P")))

    count = 0
    for text, cp_type in all_copyrights:
        type_id = await conn.fetchval(
            "SELECT id FROM spotify.copyright_type_enum WHERE name = $1",
            cp_type,
        )
        if not type_id:
            type_id = await conn.fetchval(
                "SELECT id FROM spotify.copyright_type_enum WHERE name = 'P'",
            )

        existing = await conn.fetchval(
            "SELECT id FROM spotify.copyright WHERE text = $1",
            text,
        )
        if not existing and type_id:
            copyright_id = await conn.fetchval(
                """
                INSERT INTO spotify.copyright (text, type_id)
                VALUES ($1, $2)
                RETURNING id
            """,
                text,
                type_id,
            )
            count += 1

    print(f"  Migrated {count} copyrights")


async def migrate_album_copyrights(conn, sqlite_cursor):
    print("Migrating album copyrights...")

    sqlite_cursor.execute(
        "SELECT id, copyrights FROM album WHERE copyrights IS NOT NULL AND copyrights != ''"
    )
    albums = sqlite_cursor.fetchall()

    count = 0
    for spotify_id, copyrights_json in albums:
        album_id = await conn.fetchval(
            "SELECT id FROM spotify.album WHERE spotify_id = $1",
            spotify_id,
        )
        if not album_id:
            continue

        copyrights = parse_json_safe(copyrights_json)
        for cp in copyrights:
            if not cp or not cp.get("text"):
                continue
            copyright_id = await conn.fetchval(
                "SELECT id FROM spotify.copyright WHERE text = $1",
                cp.get("text", ""),
            )
            if copyright_id:
                existing = await conn.fetchval(
                    "SELECT 1 FROM spotify.album_copyright WHERE album_id = $1 AND copyright_id = $2",
                    album_id,
                    copyright_id,
                )
                if not existing:
                    await conn.execute(
                        "INSERT INTO spotify.album_copyright (album_id, copyright_id) VALUES ($1, $2)",
                        album_id,
                        copyright_id,
                    )
                    count += 1

    print(f"  Migrated {count} album-copyright relations")


async def migrate_album_artists(conn, sqlite_cursor):
    print("Migrating album artists...")

    sqlite_cursor.execute(
        "SELECT id, artists FROM album WHERE artists IS NOT NULL AND artists != ''"
    )
    albums = sqlite_cursor.fetchall()

    count = 0
    for spotify_id, artists_json in albums:
        album_id = await conn.fetchval(
            "SELECT id FROM spotify.album WHERE spotify_id = $1",
            spotify_id,
        )
        if not album_id:
            continue

        artists = parse_json_safe(artists_json)
        for artist_data in artists:
            if not artist_data or not artist_data.get("id"):
                continue
            artist_spotify_id = artist_data.get("id")
            artist_id = await conn.fetchval(
                "SELECT id FROM spotify.artist WHERE spotify_id = $1",
                artist_spotify_id,
            )
            if artist_id:
                existing = await conn.fetchval(
                    "SELECT 1 FROM spotify.album_artist WHERE album_id = $1 AND artist_id = $2",
                    album_id,
                    artist_id,
                )
                if not existing:
                    await conn.execute(
                        "INSERT INTO spotify.album_artist (album_id, artist_id) VALUES ($1, $2)",
                        album_id,
                        artist_id,
                    )
                    count += 1

    print(f"  Migrated {count} album-artist relations")


async def migrate_track_artists(conn, sqlite_cursor):
    print("Migrating track artists...")

    sqlite_cursor.execute(
        "SELECT id, artists FROM song WHERE artists IS NOT NULL AND artists != ''"
    )
    songs = sqlite_cursor.fetchall()

    count = 0
    for spotify_id, artists_json in songs:
        track_id = await conn.fetchval(
            "SELECT id FROM spotify.track WHERE spotify_id = $1",
            spotify_id,
        )
        if not track_id:
            continue

        artists = parse_json_safe(artists_json)
        for artist_data in artists:
            if not artist_data or not artist_data.get("id"):
                continue
            artist_spotify_id = artist_data.get("id")
            artist_id = await conn.fetchval(
                "SELECT id FROM spotify.artist WHERE spotify_id = $1",
                artist_spotify_id,
            )
            if artist_id:
                existing = await conn.fetchval(
                    "SELECT 1 FROM spotify.track_artist WHERE track_id = $1 AND artist_id = $2",
                    track_id,
                    artist_id,
                )
                if not existing:
                    await conn.execute(
                        "INSERT INTO spotify.track_artist (track_id, artist_id) VALUES ($1, $2)",
                        track_id,
                        artist_id,
                    )
                    count += 1

    print(f"  Migrated {count} track-artist relations")


async def migrate_external_images(conn, sqlite_cursor):
    print("Migrating external images...")

    sqlite_cursor.execute(
        "SELECT images FROM album WHERE images IS NOT NULL AND images != '[]'"
    )
    all_images = set()
    for row in sqlite_cursor.fetchall():
        images = parse_json_safe(row[0])
        for img in images:
            if img and img.get("url"):
                all_images.add(img.get("url"))

    sqlite_cursor.execute(
        "SELECT images FROM artist WHERE images IS NOT NULL AND images != '[]'"
    )
    for row in sqlite_cursor.fetchall():
        images = parse_json_safe(row[0])
        for img in images:
            if img and img.get("url"):
                all_images.add(img.get("url"))

    count = 0
    for url in all_images:
        existing = await conn.fetchval(
            "SELECT id FROM spotify.external_image WHERE url = $1",
            url,
        )
        if not existing:
            await conn.execute(
                "INSERT INTO spotify.external_image (url) VALUES ($1)",
                url,
            )
            count += 1

    print(f"  Migrated {count} external images")


async def migrate_album_external_images(conn, sqlite_cursor):
    print("Migrating album external images...")

    sqlite_cursor.execute(
        "SELECT id, images FROM album WHERE images IS NOT NULL AND images != '[]'"
    )
    albums = sqlite_cursor.fetchall()

    count = 0
    for spotify_id, images_json in albums:
        album_id = await conn.fetchval(
            "SELECT id FROM spotify.album WHERE spotify_id = $1",
            spotify_id,
        )
        if not album_id:
            continue

        images = parse_json_safe(images_json)
        for img in images:
            if not img or not img.get("url"):
                continue
            external_image_id = await conn.fetchval(
                "SELECT id FROM spotify.external_image WHERE url = $1",
                img.get("url"),
            )
            if external_image_id:
                existing = await conn.fetchval(
                    "SELECT 1 FROM spotify.album_external_image WHERE album_id = $1 AND external_image_id = $2",
                    album_id,
                    external_image_id,
                )
                if not existing:
                    await conn.execute(
                        "INSERT INTO spotify.album_external_image (album_id, external_image_id) VALUES ($1, $2)",
                        album_id,
                        external_image_id,
                    )
                    count += 1

    print(f"  Migrated {count} album-external-image relations")


async def migrate_artist_external_images(conn, sqlite_cursor):
    print("Migrating artist external images...")

    sqlite_cursor.execute(
        "SELECT id, images FROM artist WHERE images IS NOT NULL AND images != '[]'"
    )
    artists = sqlite_cursor.fetchall()

    count = 0
    for spotify_id, images_json in artists:
        artist_id = await conn.fetchval(
            "SELECT id FROM spotify.artist WHERE spotify_id = $1",
            spotify_id,
        )
        if not artist_id:
            continue

        images = parse_json_safe(images_json)
        for img in images:
            if not img or not img.get("url"):
                continue
            external_image_id = await conn.fetchval(
                "SELECT id FROM spotify.external_image WHERE url = $1",
                img.get("url"),
            )
            if external_image_id:
                existing = await conn.fetchval(
                    "SELECT 1 FROM spotify.artist_external_image WHERE artist_id = $1 AND external_image_id = $2",
                    artist_id,
                    external_image_id,
                )
                if not existing:
                    await conn.execute(
                        "INSERT INTO spotify.artist_external_image (artist_id, external_image_id) VALUES ($1, $2)",
                        artist_id,
                        external_image_id,
                    )
                    count += 1

    print(f"  Migrated {count} artist-external-image relations")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
