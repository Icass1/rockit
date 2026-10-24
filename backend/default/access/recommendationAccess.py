"""Playlist membership projection owned by the playlist provider."""


class RecommendationAccess:
    @staticmethod
    def playlist_edges_cte_fragment() -> str:
        """Expose membership for generic co-occurrence ranking."""
        return """SELECT playlist_id, media_id
                  FROM default_schema.playlist_media"""
