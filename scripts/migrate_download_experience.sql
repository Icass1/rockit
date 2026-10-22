-- Run once before deploying the downloads experience update (also safe to repeat).
BEGIN;
ALTER TABLE core."user" ADD COLUMN IF NOT EXISTS auto_add_downloads_to_library boolean NOT NULL DEFAULT false;
ALTER TABLE core.download_group ADD COLUMN IF NOT EXISTS source_public_id varchar NULL;
ALTER TABLE core.download ADD COLUMN IF NOT EXISTS seen boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS ix_download_browse ON core.download (download_group_id, seen, id);
CREATE INDEX IF NOT EXISTS ix_download_status_browse ON core.download_status (download_id, id);
CREATE INDEX IF NOT EXISTS ix_download_group_browse ON core.download_group (user_id, seen, date_started, id);
INSERT INTO core.vocabulary (key, lang_id, value)
SELECT entries.key, language.id, CASE WHEN language.lang_code LIKE 'es%' THEN entries.es ELSE entries.en END
FROM core.language AS language CROSS JOIN (VALUES
('DOWNLOADER_NEXT_PAGE', 'Next page', 'Página siguiente'),
('DOWNLOADER_PREVIOUS_PAGE', 'Previous page', 'Página anterior'),
('DOWNLOADER_SEARCH', 'Search downloads by song, album or playlist', 'Buscar descargas por canción, álbum o playlist'),
('DOWNLOADER_DELETE_GROUP', 'Delete the downloaded files in this group? This does not delete the source album or playlist.', '¿Borrar los archivos descargados de este grupo? Esto no borra el álbum o la playlist de origen.'),
('DOWNLOADER_SHOW_TRACKS', 'Show tracks', 'Ver canciones'),
('DOWNLOADER_HIDE_TRACKS', 'Hide tracks', 'Ocultar canciones'),
('DOWNLOADER_AUTO_LIBRARY', 'Automatically add downloads to my library', 'Añadir las descargas automáticamente a mi biblioteca'),
('DOWNLOADER_PAGE', 'Page', 'Página')
) AS entries(key, en, es)
WHERE NOT EXISTS (SELECT 1 FROM core.vocabulary AS current WHERE current.key = entries.key AND current.lang_id = language.id);
INSERT INTO core.vocabulary (key, lang_id, value)
SELECT 'DOWNLOADER_ACTIVITY', language.id, CASE WHEN language.lang_code LIKE 'es%' THEN 'Actividad de los últimos 14 días' ELSE 'Activity over the last 14 days' END
FROM core.language AS language
WHERE NOT EXISTS (SELECT 1 FROM core.vocabulary AS current WHERE current.key = 'DOWNLOADER_ACTIVITY' AND current.lang_id = language.id);
COMMIT;
