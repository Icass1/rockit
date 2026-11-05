from pydantic import BaseModel

from core.models.themePreference import ThemePreference


class UpdateThemeRequest(BaseModel):
    theme: ThemePreference
