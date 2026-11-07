"""Local search projection owned by RadioBrowser."""

from core.enums.mediaTypeEnum import MediaTypeEnum


class RadioSearchIndex:
    @staticmethod
    def fragment() -> str:
        """Stations have external favicons, not internal image IDs.

        A typed NULL keeps this projection compatible with every other source.
        Station responses continue to use favicon_url independently of this index.
        """
        return f"""    SELECT cm.id AS internal_id,
           cm.public_id AS public_id,
           s.name AS name,
           NULLIF(string_agg(DISTINCT tg.tag, ', '), '') AS subtitle,
           {MediaTypeEnum.RADIO.value} AS media_type_key,
           p.name AS provider_name,
           CAST(NULL AS INTEGER) AS image_id
    FROM radio_browser.station s
    JOIN core.media cm ON cm.id = s.id
    JOIN core.provider p ON p.id = cm.provider_id
    LEFT JOIN radio_browser.station_tag st ON st.station_id = s.id
    LEFT JOIN radio_browser.tag tg ON tg.id = st.tag_id
    GROUP BY cm.id, cm.public_id, s.name, p.name"""
