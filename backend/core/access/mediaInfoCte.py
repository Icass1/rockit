def build_cte(name: str, fragments: list[str]) -> str:
    """Wrap UNION ALL'd SELECT fragments in a named CTE."""
    return f"{name} AS (\n" + "\n\nUNION ALL\n\n".join(fragments) + "\n)"


def empty_cte(name: str, columns: list[tuple[str, str]]) -> str:
    """Return a zero-row CTE with the correct column names and types."""
    cols = ", ".join(f"NULL::{t} AS {c}" for c, t in columns)
    return f"{name} AS (SELECT {cols} WHERE false)"


def get_media_info_cte() -> str:
    """CTE aggregating (media_id, duration_ms, public_id, media_name, image_url,
    media_type_key) across every registered media provider."""

    from backend.core.framework import providers

    frags = [
        p.get_stats_media_info_cte_fragment() for p in providers.get_media_providers()
    ]
    frags = [f for f in frags if f]
    if not frags:
        return empty_cte(
            "media_info",
            [
                ("media_id", "int"),
                ("duration_ms", "bigint"),
                ("public_id", "text"),
                ("media_name", "text"),
                ("image_url", "text"),
                ("media_type_key", "int"),
            ],
        )
    return build_cte("media_info", frags)


def get_artist_info_cte() -> str:
    """CTE aggregating (media_id, artist_public_id, artist_name, artist_image_url)
    across every registered media provider."""

    from backend.core.framework import providers

    frags = [
        p.get_stats_artist_info_cte_fragment() for p in providers.get_media_providers()
    ]
    frags = [f for f in frags if f]
    if not frags:
        return empty_cte(
            "artist_info",
            [
                ("media_id", "int"),
                ("artist_public_id", "text"),
                ("artist_name", "text"),
                ("artist_image_url", "text"),
            ],
        )
    return build_cte("artist_info", frags)


def get_genre_info_cte() -> str:
    """CTE aggregating (media_id, genre_name) across every registered media
    provider that has genre data. A media item may appear multiple times
    (multiple artists/genres)."""

    from backend.core.framework import providers

    frags = [
        p.get_stats_genre_info_cte_fragment() for p in providers.get_media_providers()
    ]
    frags = [f for f in frags if f]
    if not frags:
        return empty_cte(
            "genre_info",
            [
                ("media_id", "int"),
                ("genre_name", "text"),
            ],
        )
    return build_cte("genre_info", frags)


def get_album_info_cte() -> str:
    """CTE aggregating (media_id, album_public_id, album_name, album_image_url)
    across every registered media provider."""

    from backend.core.framework import providers

    frags = [
        p.get_stats_album_info_cte_fragment() for p in providers.get_media_providers()
    ]
    frags = [f for f in frags if f]
    if not frags:
        return empty_cte(
            "album_info",
            [
                ("media_id", "int"),
                ("album_public_id", "text"),
                ("album_name", "text"),
                ("album_image_url", "text"),
            ],
        )
    return build_cte("album_info", frags)
