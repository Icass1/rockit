# Backend tests

Install with `uv sync --project apps/backend --locked`; run `uv run --project apps/backend
pytest`. Tests never read deployment environment files or initialize application services.

For full coverage, start the disposable services:

```sh
docker compose -f compose.test.yaml up -d --wait
export ROCKIT_TEST_DATABASE_URL=postgresql+asyncpg://postgres:rockit-test@127.0.0.1:15432/postgres
export ROCKIT_TEST_S3_ENDPOINT=http://127.0.0.1:19000
uv run --project apps/backend pytest -q
docker compose -f compose.test.yaml down -v
```

PostgreSQL tests create/drop an isolated random database for each test. Silo tests use
random buckets with the test-only credentials in `compose.test.yaml`. FFmpeg must be
installed for real media tests. Without the two test URLs, the corresponding integration
tests skip; unit tests still run with mocked S3 and provider calls.

Coverage includes sessions, collections, playback synchronization, YouTube reliability,
all four provider download-to-S3 flows, direct/chunked/album uploads, upload ownership,
retries and scratch loss, streaming GET/HEAD/ranges, images/blur/profile validation,
video frames/audio extraction, ZIP exports, APK delivery, checksums, publication failures,
transaction/savepoint compensation, referenced-object deletion, migrations, and notifications.
External provider network calls are mocked; PostgreSQL, Silo, and media transformations
are real in the integration suite.
