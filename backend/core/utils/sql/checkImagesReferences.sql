WITH refs AS (
    SELECT image_id, 'core user' AS source FROM core."user" WHERE image_id IS NOT NULL
    UNION ALL
    SELECT image_id, 'default_schema playlist' FROM default_schema.playlist
    UNION ALL
    SELECT image_id, 'rockit album' FROM rockit.album
    UNION ALL
    SELECT image_id, 'rockit artist' FROM rockit.artist
    UNION ALL
    SELECT image_id, 'rockit song' FROM rockit.song
    UNION ALL
    SELECT image_id, 'rockit video' FROM rockit.video
    UNION ALL
    SELECT image_id, 'spotify album' FROM spotify.album
    UNION ALL
    SELECT image_id, 'spotify artist' FROM spotify.artist
    UNION ALL
    SELECT image_id, 'spotify playlist' FROM spotify.playlist
    UNION ALL
    SELECT image_id, 'spotify_scrapper album' FROM spotify_scrapper.album
    UNION ALL
    SELECT image_id, 'spotify_scrapper artist' FROM spotify_scrapper.artist
    UNION ALL
    SELECT image_id, 'spotify_scrapper playlist' FROM spotify_scrapper.playlist
    UNION ALL
    SELECT image_id, 'youtube channel' FROM youtube.channel
    UNION ALL
    SELECT image_id, 'youtube playlist' FROM youtube.playlist
    UNION ALL
    SELECT image_id, 'youtube video' FROM youtube.video
    UNION ALL
    SELECT image_id, 'youtube_music album' FROM youtube_music.album
    UNION ALL
    SELECT image_id, 'youtube_music artist' FROM youtube_music.artist
    UNION ALL
    SELECT image_id, 'youtube_music playlist' FROM youtube_music.playlist
    UNION ALL
    SELECT image_id, 'youtube_music track' FROM youtube_music.track
)
SELECT
    i.id AS image_id,
    i.path,
    COUNT(*) AS reference_count,
    string_agg(source, ', ' ORDER BY source) AS referenced_by
FROM refs r
JOIN core.image i
    ON i.id = r.image_id
GROUP BY i.id, i.path
HAVING COUNT(*) > 1
ORDER BY reference_count DESC, i.id;