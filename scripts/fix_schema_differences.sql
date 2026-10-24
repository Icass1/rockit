-- Bring databases created before the ORM definitions in this change up to
-- date. Each index is created only when no index with the same columns and
-- uniqueness already exists, regardless of its current name.
BEGIN;

ALTER TABLE core.download_group
    ALTER COLUMN seen SET DEFAULT false;

ALTER TABLE core.image
    ALTER COLUMN dominant_color SET DEFAULT '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_class t ON t.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'core'
          AND t.relname = 'app_version'
          AND i.indisunique = false
          AND (SELECT array_agg(a.attname ORDER BY k.ordinality)
               FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ordinality)
               JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
               WHERE k.ordinality <= i.indnkeyatts) = ARRAY['public_id']::name[]
    ) THEN
        CREATE INDEX ix_app_version_public_id ON core.app_version (public_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_class t ON t.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'lrclib'
          AND t.relname = 'lyrics_line'
          AND i.indisunique = false
          AND (SELECT array_agg(a.attname ORDER BY k.ordinality)
               FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ordinality)
               JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
               WHERE k.ordinality <= i.indnkeyatts) = ARRAY['text']::name[]
    ) THEN
        CREATE INDEX ix_lyrics_line_text ON lrclib.lyrics_line (text);
    END IF;
END $$;

COMMIT;
