DO $$
DECLARE
    r RECORD;
    seq_name TEXT;
    max_val BIGINT;
BEGIN
    FOR r IN
        SELECT
            table_schema,
            table_name,
            column_name
        FROM information_schema.columns
        WHERE table_schema = 'core'
          AND column_default LIKE 'nextval%'
    LOOP
        seq_name := pg_get_serial_sequence(
            r.table_schema || '.' || r.table_name,
            r.column_name
        );

        IF seq_name IS NOT NULL THEN
            EXECUTE format(
                'SELECT COALESCE(MAX(%I), 0) FROM %I.%I',
                r.column_name,
                r.table_schema,
                r.table_name
            ) INTO max_val;

            PERFORM setval(seq_name, GREATEST(max_val, 1));

            RAISE NOTICE 'Set sequence % to %', seq_name, GREATEST(max_val, 1);
        END IF;
    END LOOP;
END;
$$;
