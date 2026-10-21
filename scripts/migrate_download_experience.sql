-- Run once before deploying the downloads experience update (also safe to repeat).
BEGIN;
ALTER TABLE core."user" ADD COLUMN IF NOT EXISTS auto_add_downloads_to_library boolean NOT NULL DEFAULT false;
ALTER TABLE core.download_group ADD COLUMN IF NOT EXISTS source_public_id varchar NULL;
ALTER TABLE core.download ADD COLUMN IF NOT EXISTS seen boolean NOT NULL DEFAULT false;
COMMIT;
