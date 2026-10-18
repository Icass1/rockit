# S3 workflows

Silo is configured in `compose.yaml`; the image is pinned to
`pgsty/silo:RELEASE.2026-09-16T00-00-00Z`. Its `/data` directory uses a named volume.
The backend uses `S3_PRIVATE_ENDPOINT_URL`; signed URLs use
`S3_PUBLIC_ENDPOINT_URL`. Configure a public HTTPS endpoint for remote browsers and
phones, preserving the signed host and path. A signing endpoint is not a public bucket:
objects remain private. Direct browser S3 access also needs bucket CORS appropriate to
that deployment. Stable application streaming routes do not require S3 browser CORS.

`core.storage_object` stores bucket, immutable key, logical original filename/key,
content type, size, ETag, SHA-256, public ID, timestamps, and creator. Songs/videos,
provider downloads, images, APKs, build sessions, and staged upload items use foreign
keys to those records. Provider/source URLs retain their external meaning.

Files are uploaded through boto3's bounded multipart transfer. Size and SHA-256
metadata are checked before registration; local materialization independently checks
SHA-256. ETag is never interpreted as a universal content hash. Requests use a shared
S3 transport with timeouts/retries, and blocking transfers execute outside the event loop.

Playback preserves existing application URLs and supports GET, HEAD, explicit ranges,
suffix ranges, open-ended ranges, 200/206/416, and exact content length/range headers.
Transport bodies close on completion or cancellation. Images and APKs use the same
streaming implementation. Video frames, audio renditions, blur images, and ZIPs use
scratch files; they can be recreated from S3. Mobile offline copies remain local to the
phone and are independent of the server's durable object store.

Upload sessions stage each item/chunk in S3, with owner checks and idempotent part names.
A retry replaces one part rather than appending duplicate bytes. Assembly rejects gaps,
invalid counts, inconsistent APK sizes, and invalid part bounds. APK 1 MiB client chunks
are staged objects, not illegal undersized S3 multipart parts. The assembled final file
is published as an immutable object; completed staged objects are removed after commit.
Successful staged requests can resume after scratch files are lost or a worker restarts.

Object signing is performed only after domain lookup; no generic authenticated endpoint
exposes or deletes every object. Foreign keys protect all domain references before physical
deletion. A successful upload with a later SQL rollback is compensated. Crash recovery is
not a distributed transaction: an interrupted process may leave unregistered bytes, and
cleanup failures are logged for reconciliation. `storage-audit` reports missing registered
objects and unregistered keys without deleting anything.

Existing filesystem data is deliberately not migrated. Legacy rows remain without a new
object reference until separately backfilled. Local `MEDIA_PATH`, `IMAGES_PATH`, and
`BUILDS_PATH` environment variables no longer select durable stores; derived directories
under `TEMP_PATH` provide scratch space. Logs and temporary transform caches are not S3
media. Size scratch space for the largest concurrent FFmpeg/ZIP operation.
