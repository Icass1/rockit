DROP TABLE IF EXISTS row_counts;

CREATE TEMP TABLE row_counts(table_name text, row_count bigint);

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema = 'spotify'
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format(
            'INSERT INTO row_counts
             SELECT ''%I.%I'', COUNT(*)
             FROM %I.%I;',
            r.table_schema, r.table_name,
            r.table_schema, r.table_name
        );
    END LOOP;
END$$;

SELECT * FROM row_counts ORDER BY row_count DESC;