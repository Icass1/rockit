# Backend tests

From `apps/backend`, run `uv run pytest -q`. The default suite contains unit tests and direct controller integration tests, using the test helpers extracted from Delices through app-template. Most tests require no PostgreSQL, HTTP server, or S3 service. The three retained listening-reward persistence tests use disposable PostgreSQL databases when `ROCKIT_TEST_DATABASE_URL` is set; otherwise they skip. GitHub PR checks explicitly exclude these persistence tests and do not start external services.

`fakes.py` records compiled PostgreSQL SQL and bound parameters with explicit scripted results. It does not emulate relational persistence. `direct_harness.py` validates JSON input and invokes registered endpoint functions without HTTP transport or middleware. Controller tests check malformed requests before SQL, selected response/error contracts, storage operations, and route inventory.

The previously separate recommendation tests are included in `tests/unit/recommendations`. Startup tests verify shared-service ordering, worker cancellation, WebSocket shutdown, and startup failure propagation. S3 unit tests replace network boundaries.

`tests/system_tests` is intentionally empty. No Rockit system-test workflow is installed.

To run the persistence checks locally, set `ROCKIT_TEST_DATABASE_URL` to a PostgreSQL admin URL (for example, `postgresql+asyncpg://postgres:postgres@localhost:5432/postgres`) before running pytest. The fixture creates and drops a uniquely named database per test.

Persistent-file regression tests use `FakeObjectStore`, an in-memory S3 boundary. They verify byte ranges, uploaded media reuse, ZIP inputs and artwork, S3 audio caching, build publication, and removal of temporary processing files without starting S3 or PostgreSQL.
