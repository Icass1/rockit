SELECT
    media_id,
    ROUND(SUM(time_ms_end - time_ms_start) / 60000.0, 4) AS total_played_minutes,
    MAX(date_updated) AS latest_date_updated
FROM core.user_media_listen_interval
WHERE user_id = :user_id
GROUP BY media_id
ORDER BY latest_date_updated DESC;