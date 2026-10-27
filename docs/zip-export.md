# ZIP export

`POST /downloader/download-zip` keeps the existing request and file response.
The auto-discovered controller, access layer, archive writer and tag helpers live
in `apps/backend/zipExport`, outside core. ZIP export is an HTTP module, not a new
music source that needs a provider database row.

Each audio source registers an optional `MediaStorage.audio_tags_statement`
projection in its own access layer. Spotify, Spotify Scrapper, YouTube Music and
Rockit supply album, artists, album artists, release date, track/disc, ISRC where
available, and artwork ID. Core only holds the extension contract. Registration
is independent of remote-provider activation. Files and tags load in two batch
queries with explicit media-ID filters; there are no per-song database/API calls.
Input order and deduplication are preserved.

Downloaded MP3s receive ID3v2.3 tags while being written into the ZIP. The writer
replaces the ID3 prefix and copies the original MPEG bytes in 1 MiB chunks;
it does not transcode, mutate library files, or stage full tagged copies.
Unrelated existing tags and fields absent from the database are retained.
Video and other file formats are copied unchanged. Corrupt ID3 tags fall back
to the original file with a warning rather than blocking the whole export.

Artwork uses the full local album image (falling back to track artwork for
uploads/YouTube Music). JPEG/PNG bytes are embedded unchanged, without resizing
or a network fetch. Other supported image formats convert to JPEG at quality 95
without resizing. An export-local, eight-entry cache reuses album covers.
Missing/corrupt artwork preserves any existing embedded cover. Artwork input is
limited to 16 MiB per image; quality is limited by the original stored image.

The 2 GiB archive limit includes tags, repeated artwork and ZIP overhead. Missing
files are skipped, duplicate names receive suffixes, and failed/cancelled builds
remove their temporary ZIP once the background writer closes it. The response
background task removes successful ZIPs after transfer, as before.

## Performance and validation

Run the synthetic copy benchmark from the repository root:

```sh
PYTHONPATH=. python apps/backend/tests/performance/zip_export_benchmark.py
```

A local warm-cache run with 32 tracks / 256 MiB of source data measured median
packaging times of 0.2532 s for the original writer and 0.1640 s for the new copy
path (about 35% less time). With a deliberately large 3,668,257-byte PNG embedded
in each song, the tagged path took 0.3042 s: approximately 112 MiB of additional
artwork increases both archive I/O and transfer size. This is a packaging benchmark,
not an end-to-end download-speed guarantee. Database, filesystem, image sizes,
browser buffering and network bandwidth affect total download time.

Unit tests generate real MP3s and verify ID3 fields, original artwork bytes,
MPEG payload equality, decoding with ffmpeg, unchanged originals, duplicate names,
missing files/artwork, corrupt tags, size limits, write failures and cancellation.
PostgreSQL integration tests exercise each provider's actual schema and disabled
provider registration. Run with `apps/backend/requirements-dev.txt` installed and
`ffmpeg` available:

```sh
ROCKIT_TEST_DATABASE_URL=postgresql+asyncpg://... python -m pytest apps/backend/tests -q
```
