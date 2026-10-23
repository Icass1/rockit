# Backend tests

Run commands from the repository root with Python 3.12. For a development
checkout, install both runtime and development dependencies into the repository
virtual environment (this command does not run tests or start the backend):

```sh
bash scripts/setup-backend-dev.sh
venv/bin/python -m pyright
```

VS Code defaults to `venv/bin/python`. If the workspace already has an interpreter
selected, choose **Python: Select Interpreter** and select that path, then restart
the language server. Pylance's `Import "pytest" could not be resolved` and unknown
`MonkeyPatch`/`pytest.mark` diagnostics mean the selected interpreter lacks the
development dependencies; installing runtime requirements via `scripts/update.sh`
alone does not install pytest. Do not hide these errors with ignores or fake stubs.

To run the tests separately:

```sh
python -m pip install -r backend/requirements-dev.txt
python -m pytest -m 'not integration'
```

The root `conftest.py` isolates backend configuration before package imports, so
pytest never reads deployment `.env` credentials or starts application services.
Existing unittest tests are collected alongside pytest unit tests.

For the complete suite, provide a disposable PostgreSQL administration URL:

```sh
export ROCKIT_TEST_DATABASE_URL='postgresql+asyncpg://postgres:postgres@localhost:5432/postgres'
python -m pytest
```

The database user needs permission to create databases and the `pg_trgm` extension.
Each integration test creates a randomly named `rockit_test_*` database, initializes
real SQLAlchemy tables, and drops only that database during teardown. The database
specified in the URL is used solely to create and delete these test databases.
Without the URL, PostgreSQL tests are explicitly skipped. CI supplies a PostgreSQL
service and runs both unit and integration tests.

The 5,000-track fixture covers bounded pages, query counts independent of page
size, lazy nested contents, descendant search, literal wildcard matching, album
order, private and disabled entries, complete queues, duplicate occurrences,
cycle prevention, shuffle indices, and invalid starting media preserving the old
queue. API tests use an ASGI transport, with only authentication/session injection
overridden; SQL and provider response building use the real implementation.
