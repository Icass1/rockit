"""Navigation shortcuts for personal dynamic lists owned by Featured."""

from core.framework.provider.baseProvider import BaseProvider
from core.models.navigationPin import NavigationShortcut


class FeaturedProvider(BaseProvider):
    def get_navigation_shortcuts(self) -> list[NavigationShortcut]:
        """References only: contents are resolved by the existing Featured routes."""
        return [
            NavigationShortcut(
                key=key,
                name=title,
                url=f"/playlist/{key}",
                image_url="/rockit-background.png",
                default=default,
            )
            for key, title, default in (
                ("liked", "Liked Songs", True),
                ("most-listened", "Most Listened", True),
                ("recent-mix", "Recent Mix", True),
                ("last-month", "Last Month", False),
                ("year-recap", "Year Recap", False),
            )
        ]


provider = FeaturedProvider()
name = "Featured"
