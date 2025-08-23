-- DROP FUNCTION IF EXISTS main.count_all_tables(schema_name text);

-- CREATE OR REPLACE FUNCTION main.count_all_tables(schema_name text)
-- RETURNS TABLE(table_name text, number_of_rows bigint) AS $$
-- DECLARE
--     tbl text;
--     sql text;
-- BEGIN
--     FOR tbl IN
--         SELECT tables.table_name
--         FROM information_schema.tables
--         WHERE table_schema = schema_name
--           AND table_type = 'BASE TABLE'
--         ORDER BY table_name
--     LOOP
--         sql := format(
--             'SELECT %L AS table_name, COUNT(*) AS number_of_rows FROM %I.%I',
--             tbl,
--             schema_name,
--             tbl
--         );
        
--         RETURN QUERY EXECUTE sql;
--     END LOOP;
-- END;
-- $$ LANGUAGE plpgsql;

SELECT * FROM main.count_all_tables('main');
