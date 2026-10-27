# Backend tests

From `apps/backend`, run `uv run pytest -q`. The default suite contains unit tests and direct controller integration tests, using the test helpers extracted from Delices through app-template. It requires no PostgreSQL, HTTP server, or S3 service.

`fakes.py` records compiled PostgreSQL SQL and bound parameters with explicit scripted results. It does not emulate relational persistence. `direct_harness.py` validates JSON input and invokes registered endpoint functions without HTTP transport or middleware. Controller tests check malformed requests before SQL, selected response/error contracts, storage operations, and route inventory.

The previously separate recommendation tests are included in `tests/unit/recommendations`. Startup tests verify shared-service ordering, worker cancellation, WebSocket shutdown, and startup failure propagation. S3 unit tests replace network boundaries.

`tests/system_tests` is intentionally empty. No Rockit system-test workflow is installed.
