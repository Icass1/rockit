from backend.constants import get_optional_env_str

# Shared server credential; never supplied by individual users.
LASTFM_API_KEY = get_optional_env_str("LASTFM_API_KEY", default="")
