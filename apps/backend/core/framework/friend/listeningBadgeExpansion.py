"""Additional recorded-habit, collection and community families; six ranks each."""

from core.framework.models.listeningRewards import ListeningBadgeFamily

EXPANDED_BADGE_FAMILIES = (
    ListeningBadgeFamily(
        scope="morning", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="morning"
    ),
    ListeningBadgeFamily(
        scope="midday", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="midday"
    ),
    ListeningBadgeFamily(
        scope="afternoon", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="afternoon"
    ),
    ListeningBadgeFamily(
        scope="evening", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="evening"
    ),
    ListeningBadgeFamily(
        scope="monday", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="monday"
    ),
    ListeningBadgeFamily(
        scope="tuesday", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="tuesday"
    ),
    ListeningBadgeFamily(
        scope="wednesday", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="wednesday"
    ),
    ListeningBadgeFamily(
        scope="thursday", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="thursday"
    ),
    ListeningBadgeFamily(
        scope="friday", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="friday"
    ),
    ListeningBadgeFamily(
        scope="saturday", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="saturday"
    ),
    ListeningBadgeFamily(
        scope="sunday", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="sunday"
    ),
    ListeningBadgeFamily(
        scope="winter", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="winter"
    ),
    ListeningBadgeFamily(
        scope="spring", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="spring"
    ),
    ListeningBadgeFamily(
        scope="summer", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="summer"
    ),
    ListeningBadgeFamily(
        scope="autumn", targets=(1, 25, 100, 500, 2000, 10000), visual_variant="autumn"
    ),
    ListeningBadgeFamily(
        scope="new_year", targets=(1, 2, 5, 10, 25, 100), visual_variant="new_year"
    ),
    ListeningBadgeFamily(
        scope="leap_day", targets=(1, 2, 5, 10, 25, 100), visual_variant="leap_day"
    ),
    ListeningBadgeFamily(
        scope="music_day", targets=(1, 2, 5, 10, 25, 100), visual_variant="music_day"
    ),
    ListeningBadgeFamily(
        scope="halloween", targets=(1, 2, 5, 10, 25, 100), visual_variant="halloween"
    ),
    ListeningBadgeFamily(
        scope="year_end", targets=(1, 2, 5, 10, 25, 100), visual_variant="year_end"
    ),
    ListeningBadgeFamily(
        scope="months_active", targets=(1, 3, 6, 12, 36, 120), visual_variant="months_active"
    ),
    ListeningBadgeFamily(
        scope="years_active", targets=(1, 2, 3, 5, 10, 20), visual_variant="years_active"
    ),
    ListeningBadgeFamily(
        scope="weeks_active", targets=(1, 4, 13, 52, 260, 1040), visual_variant="weeks_active"
    ),
    ListeningBadgeFamily(
        scope="all_hours", targets=(3, 6, 9, 12, 18, 24), visual_variant="all_hours"
    ),
    ListeningBadgeFamily(
        scope="all_weekdays", targets=(1, 2, 3, 4, 5, 7), visual_variant="all_weekdays"
    ),
    ListeningBadgeFamily(
        scope="music_months", targets=(1, 3, 6, 9, 11, 12), visual_variant="music_months"
    ),
    ListeningBadgeFamily(
        scope="repeats", targets=(2, 5, 10, 25, 100, 500), visual_variant="repeats"
    ),
    ListeningBadgeFamily(
        scope="favorites", targets=(1, 3, 10, 25, 100, 500), visual_variant="favorites"
    ),
    ListeningBadgeFamily(
        scope="deep_rotation", targets=(1, 3, 5, 10, 25, 100), visual_variant="deep_rotation"
    ),
    ListeningBadgeFamily(
        scope="library_songs", targets=(1, 5, 10, 50, 100, 500), visual_variant="library_songs"
    ),
    ListeningBadgeFamily(
        scope="library_albums", targets=(1, 5, 10, 50, 100, 500), visual_variant="library_albums"
    ),
    ListeningBadgeFamily(
        scope="library_artists", targets=(1, 5, 10, 50, 100, 500), visual_variant="library_artists"
    ),
    ListeningBadgeFamily(
        scope="library_playlists",
        targets=(1, 5, 10, 50, 100, 500),
        visual_variant="library_playlists",
    ),
    ListeningBadgeFamily(
        scope="library_radios", targets=(1, 5, 10, 50, 100, 500), visual_variant="library_radios"
    ),
    ListeningBadgeFamily(
        scope="library_videos", targets=(1, 5, 10, 50, 100, 500), visual_variant="library_videos"
    ),
    ListeningBadgeFamily(
        scope="library_total", targets=(5, 25, 100, 500, 1000, 5000), visual_variant="library_total"
    ),
    ListeningBadgeFamily(
        scope="library_diversity", targets=(1, 2, 3, 4, 5, 6), visual_variant="library_diversity"
    ),
    ListeningBadgeFamily(
        scope="share_reach", targets=(1, 2, 3, 5, 10, 25), visual_variant="share_reach"
    ),
    ListeningBadgeFamily(
        scope="shared_discoveries",
        targets=(1, 5, 10, 25, 100, 500),
        visual_variant="shared_discoveries",
    ),
    ListeningBadgeFamily(
        scope="recommendations_received",
        targets=(1, 5, 10, 25, 100, 500),
        visual_variant="recommendations_received",
    ),
    ListeningBadgeFamily(scope="curators", targets=(1, 2, 3, 5, 10, 25), visual_variant="curators"),
    ListeningBadgeFamily(
        scope="sharing_days", targets=(1, 3, 10, 30, 100, 365), visual_variant="sharing_days"
    ),
    ListeningBadgeFamily(
        scope="album_shares", targets=(1, 3, 10, 25, 50, 100), visual_variant="album_shares"
    ),
    ListeningBadgeFamily(
        scope="artist_shares", targets=(1, 3, 10, 25, 50, 100), visual_variant="artist_shares"
    ),
    ListeningBadgeFamily(
        scope="playlist_shares", targets=(1, 3, 10, 25, 50, 100), visual_variant="playlist_shares"
    ),
    ListeningBadgeFamily(
        scope="radio_shares", targets=(1, 3, 10, 25, 50, 100), visual_variant="radio_shares"
    ),
    ListeningBadgeFamily(
        scope="video_shares", targets=(1, 3, 10, 25, 50, 100), visual_variant="video_shares"
    ),
    ListeningBadgeFamily(
        scope="song_shares", targets=(1, 3, 10, 25, 50, 100), visual_variant="song_shares"
    ),
)
