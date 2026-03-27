import random
from datetime import datetime, timedelta
from typing import List

from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.responses.statsHeatmapCellResponse import StatsHeatmapCellResponse
from backend.core.responses.statsMinutesEntryResponse import StatsMinutesEntryResponse
from backend.core.responses.statsRankedItemResponse import StatsRankedItemResponse
from backend.core.responses.statsSummaryResponse import StatsSummaryResponse
from backend.core.responses.userStatsResponse import UserStatsResponse
from backend.utils.logger import getLogger

logger = getLogger(__name__)

MINUTES_CHART_DAYS = 8
HEATMAP_DAYS = 7
HEATMAP_HOURS_START = 8
HEATMAP_HOURS_END = 23

MOCK_SONGS = [
    ("Stressed Out", "Twenty One Pilots", "/song/stressed-out"),
    ("Ride", "Twenty One Pilots", "/song/ride"),
    ("Heathens", "Twenty One Pilots", "/song/heathens"),
    ("Car Radio", "Twenty One Pilots", "/song/car-radio"),
    ("Holding On To You", "Twenty One Pilots", "/song/holding-on"),
    ("Sad!", "XXXTentacion", "/song/sad"),
    ("Havana", "Camila Cabello", "/song/havana"),
    ("Perfect", "Ed Sheeran", "/song/perfect"),
    ("Shape of You", "Ed Sheeran", "/song/shape-of-you"),
    ("Believer", "Imagine Dragons", "/song/believer"),
    ("Thunder", "Imagine Dragons", "/song/thunder"),
    ("Radioactive", "Imagine Dragons", "/song/radioactive"),
    ("Levitating", "Dua Lipa", "/song/levitating"),
    ("Blinding Lights", "The Weeknd", "/song/blinding-lights"),
    ("Save Your Tears", "The Weeknd", "/song/save-your-tears"),
    ("Bohemian Rhapsody", "Queen", "/song/bohemian-rhapsody"),
    ("Don't Stop Me Now", "Queen", "/song/dont-stop-me-now"),
    ("Circles", "Post Malone", "/song/circles"),
    ("Sunflower", "Post Malone", "/song/sunflower"),
    ("Heat Waves", "Glass Animals", "/song/heat-waves"),
]

MOCK_ALBUMS = [
    ("Trench", "Twenty One Pilots", "/album/trench"),
    ("Blurryface", "Twenty One Pilots", "/album/blurryface"),
    ("Vessel", "Twenty One Pilots", "/album/vessel"),
    ("Scaled and Icy", "Twenty One Pilots", "/album/scaled-and-icy"),
    ("÷ (Divide)", "Ed Sheeran", "/album/divide"),
    ("÷ (Multiply)", "Ed Sheeran", "/album/multiply"),
    ("After Hours", "The Weeknd", "/album/after-hours"),
    ("Starboy", "The Weeknd", "/album/starboy"),
    ("Evolve", "Imagine Dragons", "/album/evolve"),
    ("Origins", "Imagine Dragons", "/album/origins"),
    ("Fineapple", "Camila Cabello", "/album/fineapple"),
    ("Future Nostalgia", "Dua Lipa", "/album/future-nostalgia"),
    ("Circles", "Post Malone", "/album/circles"),
    ("Hollywood's Bleeding", "Post Malone", "/album/hollywood-bleeding"),
    ("News of the World", "Queen", "/album/news-of-the-world"),
    ("A Night at the Opera", "Queen", "/album/night-at-opera"),
]

MOCK_ARTISTS = [
    ("Twenty One Pilots", 42),
    ("Ed Sheeran", 28),
    ("The Weeknd", 24),
    ("Imagine Dragons", 22),
    ("Post Malone", 18),
    ("Queen", 15),
    ("Dua Lipa", 12),
    ("Camila Cabello", 10),
    ("XXXTentacion", 8),
]

MOCK_IMAGE_URLS = [
    "https://i.scdn.co/image/ab67616d00001e02",
    "https://i.scdn.co/image/ab67616d0000b273",
    "https://i.scdn.co/image/ab67616d00004820",
]


def _generate_mock_summary() -> StatsSummaryResponse:
    songs = random.randint(25, 150)
    avg_duration = random.uniform(3.0, 4.5)
    minutes = songs * avg_duration
    return StatsSummaryResponse(
        songsListened=songs,
        minutesListened=round(minutes, 1),
        avgMinutesPerSong=round(avg_duration, 2),
        currentStreak=random.randint(1, 14),
        topGenre=random.choice([
            "Alternative Hip-Hop",
            "Pop",
            "Indie Pop",
            "Hip-Hop",
            "Alternative Rock",
            "R&B",
            "Indie Rock",
        ]),
    )


def _generate_mock_minutes(
    start_date: datetime,
    end_date: datetime,
    group_by: str = "day"
) -> List[StatsMinutesEntryResponse]:
    entries = []
    
    if group_by == "day":
        # Last 7 days
        current = start_date
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for i in range(7):
            day_start = current + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            entries.append(
                StatsMinutesEntryResponse(
                    minutes=random.uniform(5, 45),
                    start=day_start.isoformat() + "Z",
                    end=day_end.isoformat() + "Z",
                    label=day_names[i],
                )
            )
    elif group_by == "week":
        # Last 4 weeks
        for i in range(4):
            week_start = start_date + timedelta(weeks=i)
            week_end = week_start + timedelta(weeks=1)
            entries.append(
                StatsMinutesEntryResponse(
                    minutes=random.uniform(60, 300),
                    start=week_start.isoformat() + "Z",
                    end=week_end.isoformat() + "Z",
                    label=f"W{i+1}",
                )
            )
    elif group_by == "month":
        # Last 12 months - show every 2 months for better readability
        # when bars are narrow on mobile
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        for i in range(12):
            month_start = start_date + timedelta(days=30*i)
            month_end = month_start + timedelta(days=30)
            label = month_names[i] if i % 2 == 0 else ""
            entries.append(
                StatsMinutesEntryResponse(
                    minutes=random.uniform(200, 800),
                    start=month_start.isoformat() + "Z",
                    end=month_end.isoformat() + "Z",
                    label=label,
                )
            )
    else:
        # Default to days
        current = start_date
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for i in range(7):
            day_start = current + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            entries.append(
                StatsMinutesEntryResponse(
                    minutes=random.uniform(5, 45),
                    start=day_start.isoformat() + "Z",
                    end=day_end.isoformat() + "Z",
                    label=day_names[i],
                )
            )
    
    return entries


def _generate_mock_top_songs() -> List[StatsRankedItemResponse]:
    shuffled = random.sample(MOCK_SONGS, len(MOCK_SONGS))
    return [
        StatsRankedItemResponse(
            publicId=f"song-{i+1}",
            name=name,
            href=href,
            value=random.randint(1, 8),
            imageUrl=random.choice(MOCK_IMAGE_URLS),
            subtitle=artist,
        )
        for i, (name, artist, href) in enumerate(shuffled[:10])
    ]


def _generate_mock_top_albums() -> List[StatsRankedItemResponse]:
    shuffled = random.sample(MOCK_ALBUMS, len(MOCK_ALBUMS))
    return [
        StatsRankedItemResponse(
            publicId=f"album-{i+1}",
            name=name,
            href=href,
            value=random.randint(1, 15),
            imageUrl=random.choice(MOCK_IMAGE_URLS),
            subtitle=artist,
        )
        for i, (name, artist, href) in enumerate(shuffled[:8])
    ]


def _generate_mock_top_artists() -> List[StatsRankedItemResponse]:
    shuffled = random.sample(MOCK_ARTISTS, len(MOCK_ARTISTS))
    return [
        StatsRankedItemResponse(
            publicId=f"artist-{i+1}",
            name=name,
            href=f"/artist/{name.lower().replace(' ', '-')}",
            value=v,
            imageUrl=random.choice(MOCK_IMAGE_URLS),
            subtitle=None,
        )
        for i, (name, v) in enumerate(shuffled[:6])
    ]


def _generate_mock_heatmap() -> List[StatsHeatmapCellResponse]:
    cells = []
    for day in range(HEATMAP_DAYS):
        for hour in range(HEATMAP_HOURS_START, HEATMAP_HOURS_END + 1):
            base_value = 0
            if random.random() > 0.4:
                if hour >= 18 and hour <= 22:
                    base_value = random.randint(5, 20)
                elif hour >= 10 and hour <= 17:
                    base_value = random.randint(1, 10)
                elif hour >= 8 and hour <= 10:
                    base_value = random.randint(1, 5)
            cells.append(
                StatsHeatmapCellResponse(
                    hour=hour,
                    day=day,
                    value=base_value,
                )
            )
    return cells


class StatsAccess:
    @staticmethod
    async def get_user_stats_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        group_by: str = "day",
    ) -> AResult[UserStatsResponse]:
        try:
            summary = _generate_mock_summary()
            minutes = _generate_mock_minutes(start_date, end_date, group_by)
            top_songs = _generate_mock_top_songs()
            top_albums = _generate_mock_top_albums()
            top_artists = _generate_mock_top_artists()
            heatmap = _generate_mock_heatmap()

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=UserStatsResponse(
                    summary=summary,
                    minutes=minutes,
                    topSongs=top_songs,
                    topAlbums=top_albums,
                    topArtists=top_artists,
                    heatmap=heatmap,
                ),
            )
        except Exception as e:
            logger.error(f"Error getting user stats: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Error getting user stats: {str(e)}",
            )
