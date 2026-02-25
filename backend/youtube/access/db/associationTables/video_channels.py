from sqlalchemy import Table, Column, ForeignKey

from backend.core.access.db.associationTables.generalColumns import date_added_column, date_updated_column

from backend.youtube.access.db.base import YoutubeBase


video_channels = Table(
    'video_channel', YoutubeBase.metadata,
    Column[int]('video_id', ForeignKey('youtube.video.id'), primary_key=True),
    Column[int]('channel_id', ForeignKey('youtube.channel.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='youtube'
)
