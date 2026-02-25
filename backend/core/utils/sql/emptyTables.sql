SET session_replication_role = 'replica';

TRUNCATE TABLE
    core.album,
    core.artist,
    core.song,
    core.playlist,
    core.download_group,
    core.download,
    core.download_status,
    core.error
RESTART IDENTITY CASCADE;

SET session_replication_role = 'origin';