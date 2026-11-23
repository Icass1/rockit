"""Maintain one indexed, ordered lyrics document per recording, including bulk imports."""

from core.models.databaseMigration import Migration

LYRICS_SEARCH_STATEMENTS: tuple[str, ...] = (
    "ALTER TABLE lrclib.lyrics ADD COLUMN IF NOT EXISTS "
    "search_document tsvector NOT NULL DEFAULT ''::tsvector",
    "CREATE INDEX IF NOT EXISTS ix_lyrics_search_document "
    "ON lrclib.lyrics USING gin (search_document)",
    "CREATE INDEX IF NOT EXISTS ix_lyrics_line_lyrics_id ON lrclib.lyrics_line (lyrics_id)",
    "CREATE INDEX IF NOT EXISTS ix_dynamic_lyrics_line_lyrics_id "
    "ON lrclib.dynamic_lyrics_line (lyrics_id)",
    """
    CREATE OR REPLACE FUNCTION lrclib.refresh_lyrics_search(affected_ids integer[])
    RETURNS void LANGUAGE sql AS $$
        UPDATE lrclib.lyrics l SET search_document = to_tsvector('simple'::regconfig,
            COALESCE(
                (SELECT string_agg(NULLIF(btrim(text), ''), ' ' ORDER BY line_number, id)
                 FROM lrclib.lyrics_line WHERE lyrics_id = l.id),
                (SELECT string_agg(NULLIF(btrim(text), ''), ' ' ORDER BY line_number, id)
                 FROM lrclib.dynamic_lyrics_line WHERE lyrics_id = l.id),
                ''
            ))
        WHERE affected_ids IS NULL OR l.id = ANY(affected_ids);
    $$
    """,
    """
    CREATE OR REPLACE FUNCTION lrclib.update_lyrics_search()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE affected_ids integer[];
    BEGIN
        IF TG_OP = 'INSERT' THEN
            SELECT array_agg(DISTINCT lyrics_id) INTO affected_ids FROM new_lines;
        ELSIF TG_OP = 'DELETE' THEN
            SELECT array_agg(DISTINCT lyrics_id) INTO affected_ids FROM old_lines;
        ELSE
            SELECT array_agg(DISTINCT lyrics_id) INTO affected_ids
            FROM (SELECT lyrics_id FROM new_lines UNION SELECT lyrics_id FROM old_lines) changed;
        END IF;
        IF affected_ids IS NOT NULL THEN
            PERFORM lrclib.refresh_lyrics_search(affected_ids);
        END IF;
        RETURN NULL;
    END;
    $$
    """,
    *(
        f"CREATE TRIGGER lyrics_search_{operation.lower()} AFTER {operation} "
        f"ON lrclib.{table} REFERENCING {references} "
        "FOR EACH STATEMENT EXECUTE FUNCTION lrclib.update_lyrics_search()"
        for table in ("lyrics_line", "dynamic_lyrics_line")
        for operation, references in (
            ("INSERT", "NEW TABLE AS new_lines"),
            ("DELETE", "OLD TABLE AS old_lines"),
            ("UPDATE", "OLD TABLE AS old_lines NEW TABLE AS new_lines"),
        )
    ),
    "SELECT lrclib.refresh_lyrics_search(NULL)",
)


MIGRATIONS: tuple[Migration, ...] = (
    Migration(version=7, name="index_lyrics_search", statements=LYRICS_SEARCH_STATEMENTS),
    Migration(
        version=8,
        name="lyrics_word_timing",
        statements=(
            "ALTER TABLE lrclib.dynamic_lyrics_line ADD COLUMN IF NOT EXISTS "
            "words jsonb NOT NULL DEFAULT '[]'::jsonb",
            "ALTER TABLE lrclib.dynamic_lyrics_line ADD COLUMN IF NOT EXISTS "
            "end_timestamp_s double precision",
        ),
    ),
)
