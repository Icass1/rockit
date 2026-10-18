# Database infrastructure

The database platform is adapted from app-template, preserving Rockit's schemas,
provider IDs, public IDs, user playback fields, username login, and signed/legacy
sessions. `core/access/db/database.py` manages engine lifecycle, `schema.py` discovers
Rockit modules, `session.py` owns transaction/sequence helpers and creator attribution,
and `schema_check.py` compares ORM metadata with PostgreSQL.

New databases use current ORM metadata. Existing databases receive forward-only SQL
migrations from `core/access/db/migrations.py`. Versions are increasing and unique;
startup takes a transaction advisory lock and records each successful migration in
`core.database_migrations`. Failed SQL rolls back the upgrade and its history entry.
Never edit a migration after deployment; append and test another version.

The initial storage upgrade adds nullable object references and relaxes legacy path
constraints. It does not upload local files, fabricate object references, or drop old
columns. Creator attribution is added to every affected Rockit table, including tables
outside the template's original core. HTTP authentication sets the session's `added_by`;
legacy/system-created rows may leave it unknown.

Connections use password authentication or fresh AWS IAM tokens. Set `DB_IAM_AUTH`,
`DB_REGION`, `DB_SSLMODE`, and optionally `DB_SSLROOTCERT` to configure IAM and verified
TLS. IAM cannot use disabled TLS. Passwords and signing keys are never dumped in logs.
S3 credentials are independent and support either explicit configuration or the AWS
credential chain.

S3 and PostgreSQL have separate transactions. Storage publication registers immutable
metadata after a successful transfer. SQL rollback/close removes keys created in that
transaction, including savepoint-specific compensation. Physical deletion occurs after
committed metadata deletion and all foreign keys are checked first. A process crash or
transport failure during cleanup can still leave an orphan; use `storage-audit` to inspect
storage before considering any manual cleanup. Back up PostgreSQL and Silo together.
