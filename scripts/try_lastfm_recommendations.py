"""Call Rockit's real Last.fm provider without starting the server or downloads.

Run from the repository root:
    venv/bin/python -m scripts.try_lastfm_recommendations
    venv/bin/python -m scripts.try_lastfm_recommendations --env-file backend/.env
"""

import argparse
import asyncio
import contextlib
import io
import os
from pathlib import Path


async def main() -> int:
    """Print live provider results for explicit artist/title seeds."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path)
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--seed", nargs=2, action="append", metavar=("ARTIST", "TRACK"))
    args = parser.parse_args()
    if not 1 <= args.limit <= 50:
        parser.error("--limit must be between 1 and 50")
    if args.env_file is not None:
        if not args.env_file.is_file():
            parser.error(
                "--env-file must point to an existing backend environment file"
            )
        os.environ["ROCKIT_ENV_FILE"] = str(args.env_file.resolve())

    # The backend's config loader prints environment values on import. Keep
    # those out of the output so results can be shared without credentials.
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            from backend.lastfm.framework.provider.lastfmProvider import LastfmProvider
            from backend.core.framework.models.recommendation import (
                ERecommendationContextKind,
                ExternalRecommendationContext,
                SeedTrack,
            )
    except SystemExit:
        print("Backend configuration is incomplete. Use --env-file with its full .env.")
        return 1

    provider = LastfmProvider()
    if not provider.is_configured():
        print("LASTFM_API_KEY is missing from the backend environment.")
        return 1

    seeds: list[tuple[str, str]] = args.seed or [
        ("Twenty One Pilots", "Stressed Out"),
        ("Imagine Dragons", "Believer"),
    ]
    failed = False
    for artist, track in seeds:
        print(f"\nSimilar to {artist} — {track}:")
        result = await provider.get_suggestions_async(
            context=ExternalRecommendationContext(
                kind=ERecommendationContextKind.SEED,
                seed=SeedTrack(artist_name=artist, track_name=track),
            ),
            limit=args.limit,
        )
        if result.is_not_ok():
            print(f"  Error: {result.message()}")
            failed = True
            continue
        suggestions = result.result()
        if not suggestions:
            print("  Last.fm returned no similar tracks.")
        for index, suggestion in enumerate(suggestions, start=1):
            print(f"  {index}. {suggestion.artist_name} — {suggestion.track_name}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
