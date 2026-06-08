SELECT
    media_id,
    SUM(time_ms_end - time_ms_start) AS total_played_ms
FROM core.user_media_listen_interval
WHERE user_id = :user_id
GROUP BY media_id
ORDER BY total_played_ms DESC;