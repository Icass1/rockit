import spotdl.download
import spotdl.download.downloader
import spotdl.providers.audio.base

import requests
from typing import Dict, List, Tuple
from bs4 import BeautifulSoup

import logging
from typing import Dict, List, Optional, Tuple


from spotdl.types.result import Result
from spotdl.types.song import Song
from spotdl.utils.formatter import (
    create_search_query,
    create_song_title,
)
from spotdl.utils.matching import get_best_matches, order_results

__all__ = ["AudioProviderError", "AudioProvider", "ISRC_REGEX", "YTDLLogger"]

logger = logging.getLogger(__name__)


from difflib import SequenceMatcher

from logger import getLogger






import asyncio
import datetime
import json
import logging
import re
import shutil
import sys
import traceback
from argparse import Namespace
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Type, Union

from yt_dlp.postprocessor.modify_chapters import ModifyChaptersPP
from yt_dlp.postprocessor.sponsorblock import SponsorBlockPP

from spotdl.download.progress_handler import ProgressHandler
from spotdl.providers.audio import (
    AudioProvider,
    BandCamp,
    Piped,
    SliderKZ,
    SoundCloud,
    YouTube,
    YouTubeMusic,
)
from spotdl.providers.lyrics import AzLyrics, Genius, LyricsProvider, MusixMatch, Synced
from spotdl.types.options import DownloaderOptionalOptions, DownloaderOptions
from spotdl.types.song import Song
from spotdl.utils.archive import Archive
from spotdl.utils.config import (
    DOWNLOADER_OPTIONS,
    GlobalConfig,
    create_settings_type,
    get_errors_path,
    get_temp_path,
    modernize_settings,
)
from spotdl.utils.ffmpeg import FFmpegError, convert
from spotdl.utils.formatter import create_file_name
from spotdl.utils.lrc import generate_lrc
from spotdl.utils.m3u import gen_m3u_files
from spotdl.utils.metadata import MetadataError, embed_metadata
from spotdl.utils.search import gather_known_songs, reinit_song, songs_from_albums

from spotdl.download.downloader import DownloaderError, SPONSOR_BLOCK_CATEGORIES


def get_best_result(self, results: Dict[Result, float], song: Song) -> Tuple[Result, float]:
    """
    Get the best match from the results
    using views and average match

    ### Arguments
    - results: A dictionary of results and their scores

    ### Returns
    - The best match URL and its score
    """

    best_results = get_best_matches(results, 8)

    # If we have only one result, return it
    if len(best_results) == 1:
        return best_results[0][0], best_results[0][1]

    # Initial best result based on the average match
    best_result = best_results[0]

    # If the best result has a score higher than 80%
    # and it's a isrc search, return it
    if best_result[1] > 80 and best_result[0].isrc_search:
        return best_result[0], best_result[1]

    # If we have more than one result,
    # return the one with the highest score
    # and most views
    # print("get_best_result", self)
    # print("song", song)
    # print("results", results)
    if len(best_results) > 1:
        views: List[int] = []
        for best_result in best_results:
            if best_result[0].views:
                views.append(best_result[0].views)
            else:
                if best_result[0].source == "YouTubeMusic":
                    # print("Result album", best_result[0].album)
                    # print("Result name", best_result[0].name)
                    # print("Result artists", " ".join(best_result[0].artists))
                    # print("Song album", song.album_name)
                    # print("Song name", song.name)
                    # print("Song artists", " ".join(song.artists))

                    # print("album condition", best_result[0].album != None and song.album_name != None)
                    # print("album name", best_result[0].name != None  and song.name != None)
                    # print("album artists", len(best_result[0].artists) != 0 and len(song.artists) != 0)

                    if best_result[0].album != None and song.album_name != None: album_ratio = SequenceMatcher(a=best_result[0].album, b=song.album_name).ratio()
                    else: album_ratio = 0
                    
                    if best_result[0].name != None and song.name != None: name_ratio = SequenceMatcher(a=best_result[0].name, b=song.name).ratio()
                    else: name_ratio = 0

                    if len(best_result[0].artists) != 0 and len(song.artists) != 0: artists_ratio = SequenceMatcher(a=" ".join(best_result[0].artists), b=" ".join(song.artists)).ratio()
                    else: name_ratio = 0

                    duration_ratio = -abs(best_result[0].duration - song.duration)/20

                    # album_ratio = SequenceMatcher(a=best_result[0].album, b=song.album_name).ratio() if (best_result[0].album != None and song.album_name != None) else 0
                    # name_ratio = SequenceMatcher(a=best_result[0].name, b=song.name).ratio() if (best_result[0].name != None and song.name != None) else 0
                    # artists_ratio = SequenceMatcher(a=" ".join(best_result[0].artists), b=" ".join(song.artists)).ratio() if (len(best_result[0].artists) != 0 and len(song.artists) != 0) else 0

                    views.append(
                        album_ratio + 
                        name_ratio + 
                        artists_ratio + 
                        duration_ratio
                    )
                else:
                    print()
                    print()
                    print(best_result)
                    print()
                    print()

                    response = requests.get(best_result[0].url)
                    soup = BeautifulSoup(response.content, 'html.parser')
                    interaction_count_meta = soup.find("meta", itemprop="interactionCount")
                    if interaction_count_meta and "content" in interaction_count_meta:
                        _views = int(interaction_count_meta["content"])
                        views.append(_views)

        highest_views = max(views)
        lowest_views = min(views)

        # print(song.name, highest_views, lowest_views)
        # print(views)

        if highest_views in (0, lowest_views):
            return best_result[0], best_result[1]

        weighted_results: List[Tuple[Result, float]] = []
        for index, best_result in enumerate(best_results):
            result_views = views[index]
            views_score = (
                (result_views - lowest_views) / (highest_views - lowest_views)
            ) * 15
            score = min(best_result[1] + views_score, 100)
            weighted_results.append((best_result[0], score))

        # print()
        # print(weighted_results)
        # print(max(weighted_results, key=lambda x: x[1]))
        # print()

        # Now we return the result with the highest score
        return max(weighted_results, key=lambda x: x[1])

    return best_result[0], best_result[1]

spotdl.providers.audio.base.AudioProvider.get_best_result = get_best_result










def search(self, song: Song, only_verified: bool = False) -> Optional[str]:
    """
    Search for a song and return best match.

    ### Arguments
    - song: The song to search for.

    ### Returns
    - The url of the best match or None if no match was found.
    """

    # Create initial search query
    search_query = create_song_title(song.name, song.artists).lower()
    if self.search_query:
        search_query = create_search_query(
            song, self.search_query, False, None, True
        )

    logger.debug("[%s] Searching for %s", song.song_id, search_query)

    isrc_urls: List[str] = []

    # search for song using isrc if it's available
    if song.isrc and self.SUPPORTS_ISRC and not self.search_query:
        isrc_results = self.get_results(song.isrc)

        if only_verified:
            isrc_results = [result for result in isrc_results if result.verified]
            logger.debug(
                "[%s] Filtered to %s verified ISRC results",
                song.song_id,
                len(isrc_results),
            )

        isrc_urls = [result.url for result in isrc_results]
        logger.debug(
            "[%s] Found %s results for ISRC %s",
            song.song_id,
            len(isrc_results),
            song.isrc,
        )

        if len(isrc_results) == 1 and isrc_results[0].verified:
            # If we only have one verified result, return it
            # What's the chance of it being wrong?
            logger.debug(
                "[%s] Returning only ISRC result %s",
                song.song_id,
                isrc_results[0].url,
            )

            return isrc_results[0].url

        if len(isrc_results) > 0:
            sorted_isrc_results = order_results(
                isrc_results, song, self.search_query
            )

            # get the best result, if the score is above 80 return it
            best_isrc_results = sorted(
                sorted_isrc_results.items(), key=lambda x: x[1], reverse=True
            )

            logger.debug(
                "[%s] Filtered to %s ISRC results",
                song.song_id,
                len(best_isrc_results),
            )

            if len(best_isrc_results) > 0:
                best_isrc = best_isrc_results[0]
                if best_isrc[1] > 80.0:
                    logger.debug(
                        "[%s] Best ISRC result is %s with score %s",
                        song.song_id,
                        best_isrc[0].url,
                        best_isrc[1],
                    )

                    return best_isrc[0].url

    results: Dict[Result, float] = {}
    for options in self.GET_RESULTS_OPTS:
        # Query YTM by songs only first, this way if we get correct result on the first try
        # we don't have to make another request
        search_results = self.get_results(search_query, **options)

        if only_verified:
            search_results = [
                result for result in search_results if result.verified
            ]

        logger.debug(
            "[%s] Found %s results for search query %s with options %s",
            song.song_id,
            len(search_results),
            search_query,
            options,
        )

        # Check if any of the search results is in the
        # first isrc results, since they are not hashable we have to check
        # by name
        isrc_result = next(
            (result for result in search_results if result.url in isrc_urls),
            None,
        )

        if isrc_result:
            logger.debug(
                "[%s] Best ISRC result is %s", song.song_id, isrc_result.url
            )

            return isrc_result.url

        logger.debug(
            "[%s] Have to filter results: %s", song.song_id, self.filter_results
        )

        if self.filter_results:
            # Order results
            new_results = order_results(search_results, song, self.search_query)
        else:
            new_results = {}
            if len(search_results) > 0:
                new_results = {search_results[0]: 100.0}

        logger.debug("[%s] Filtered to %s results", song.song_id, len(new_results))

        # song type results are always more accurate than video type,
        # so if we get score of 80 or above
        # we are almost 100% sure that this is the correct link
        if len(new_results) != 0:
            # get the result with highest score
            best_result, best_score = self.get_best_result(new_results, song)
            logger.debug(
                "[%s] Best result is %s with score %s",
                song.song_id,
                best_result.url,
                best_score,
            )

            if best_score >= 80 and best_result.verified:
                logger.debug(
                    "[%s] Returning verified best result %s with score %s",
                    song.song_id,
                    best_result.url,
                    best_score,
                )

                return best_result.url

            # Update final results with new results
            results.update(new_results)

    # No matches found
    if not results:
        logger.debug("[%s] No results found", song.song_id)
        return None

    # get the result with highest score
    best_result, best_score = self.get_best_result(results, song)
    logger.debug(
        "[%s] Returning best result %s with score %s",
        song.song_id,
        best_result.url,
        best_score,
    )

    return best_result.url



spotdl.providers.audio.base.AudioProvider.search = search








def search_and_download(  # pylint: disable=R0911
    self: spotdl.Downloader, song: Song
) -> Tuple[Song, Optional[Path]]:
    """
    Search for the song and download it.

    ### Arguments
    - song: The song to download.

    ### Returns
    - tuple with the song and the path to the downloaded file if successful.

    ### Notes
    - This function is synchronous.
    """

    # Check if song has name/artist and url/song_id
    if not (song.name and (song.artists or song.artist)) and not (
        song.url or song.song_id
    ):
        logger.error("Song is missing required fields: %s", song.display_name)
        self.errors.append(f"Song is missing required fields: {song.display_name}")

        return song, None

    reinitialized = False
    try:
        # Create the output file path
        output_file = create_file_name(
            song=song,
            template=self.settings["output"],
            file_extension=self.settings["format"],
            restrict=self.settings["restrict"],
            file_name_length=self.settings["max_filename_length"],
        )
    except Exception:
        song = reinit_song(song)

        output_file = create_file_name(
            song=song,
            template=self.settings["output"],
            file_extension=self.settings["format"],
            restrict=self.settings["restrict"],
            file_name_length=self.settings["max_filename_length"],
        )

        reinitialized = True

    if song.explicit is True and self.settings["skip_explicit"] is True:
        logger.info("Skipping explicit song: %s", song.display_name)
        return song, None

    # Initialize the progress tracker
    display_progress_tracker = self.progress_handler.get_new_tracker(song)

    try:
        # Create the temp folder path
        temp_folder = get_temp_path()

        # Check if there is an already existing song file, with the same spotify URL in its
        # metadata, but saved under a different name. If so, save its path.
        dup_song_paths: List[Path] = self.known_songs.get(song.url, [])

        # Remove files from the list that have the same path as the output file
        dup_song_paths = [
            dup_song_path
            for dup_song_path in dup_song_paths
            if (dup_song_path.absolute() != output_file.absolute())
            and dup_song_path.exists()
        ]

        file_exists = output_file.exists() or dup_song_paths
        if not self.settings["scan_for_songs"]:
            for file_extension in self.scan_formats:
                ext_path = output_file.with_suffix(f".{file_extension}")
                if ext_path.exists():
                    dup_song_paths.append(ext_path)

        if dup_song_paths:
            logger.debug(
                "Found duplicate songs for %s at %s",
                song.display_name,
                ", ".join(
                    [f"'{str(dup_song_path)}'" for dup_song_path in dup_song_paths]
                ),
            )

        # If the file already exists and we don't want to overwrite it,
        # we can skip the download
        if (  # pylint: disable=R1705
            Path(str(output_file.absolute()) + ".skip").exists()
            and self.settings["respect_skip_file"]
        ):
            logger.info(
                "Skipping %s (skip file found) %s",
                song.display_name,
                "",
            )

            return song, output_file if output_file.exists() else None

        elif file_exists and self.settings["overwrite"] == "skip":
            logger.info(
                "Skipping %s (file already exists) %s",
                song.display_name,
                "(duplicate)" if dup_song_paths else "",
            )

            display_progress_tracker.notify_download_skip()
            return song, output_file

        # Check if we have all the metadata
        # and that the song object is not a placeholder
        # If it's None extract the current metadata
        # And reinitialize the song object
        # Force song reinitialization if we are fetching albums
        # they have most metadata but not all
        if (
            (song.name is None and song.url)
            or (self.settings["fetch_albums"] and reinitialized is False)
            or None
            in [
                song.genres,
                song.disc_count,
                song.tracks_count,
                song.track_number,
                song.album_id,
                song.album_artist,
            ]
        ):
            song = reinit_song(song)
            reinitialized = True

        # Don't skip if the file exists and overwrite is set to force
        if file_exists and self.settings["overwrite"] == "force":
            logger.info(
                "Overwriting %s %s",
                song.display_name,
                " (duplicate)" if dup_song_paths else "",
            )

            # If the duplicate song path is not None, we can delete the old file
            for dup_song_path in dup_song_paths:
                try:
                    logger.info("Removing duplicate file: %s", dup_song_path)

                    dup_song_path.unlink()
                except (PermissionError, OSError) as exc:
                    logger.debug(
                        "Could not remove duplicate file: %s, error: %s",
                        dup_song_path,
                        exc,
                    )

        # Find song lyrics and add them to the song object
        try:
            display_progress_tracker.update("Searching lyrics")

            lyrics = self.search_lyrics(song)
            if lyrics is None:
                logger.debug(
                    "No lyrics found for %s, lyrics providers: %s",
                    song.display_name,
                    ", ".join(
                        [lprovider.name for lprovider in self.lyrics_providers]
                    ),
                )
            else:
                song.lyrics = lyrics
        except Exception as exc:
            logger.debug("Could not search for lyrics: %s", exc)

        # If the file already exists and we want to overwrite the metadata,
        # we can skip the download
        if file_exists and self.settings["overwrite"] == "metadata":
            most_recent_duplicate: Optional[Path] = None
            if dup_song_paths:
                # Get the most recent duplicate song path and remove the rest
                most_recent_duplicate = max(
                    dup_song_paths,
                    key=lambda dup_song_path: dup_song_path.stat().st_mtime
                    and dup_song_path.suffix == output_file.suffix,
                )

                # Remove the rest of the duplicate song paths
                for old_song_path in dup_song_paths:
                    if most_recent_duplicate == old_song_path:
                        continue

                    try:
                        logger.info("Removing duplicate file: %s", old_song_path)
                        old_song_path.unlink()
                    except (PermissionError, OSError) as exc:
                        logger.debug(
                            "Could not remove duplicate file: %s, error: %s",
                            old_song_path,
                            exc,
                        )

                # Move the old file to the new location
                if (
                    most_recent_duplicate
                    and most_recent_duplicate.suffix == output_file.suffix
                ):
                    most_recent_duplicate.replace(
                        output_file.with_suffix(f".{self.settings['format']}")
                    )

            if (
                most_recent_duplicate
                and most_recent_duplicate.suffix != output_file.suffix
            ):
                logger.info(
                    "Could not move duplicate file: %s, different file extension",
                    most_recent_duplicate,
                )

                display_progress_tracker.notify_complete()

                return song, None

            # Update the metadata
            embed_metadata(
                output_file=output_file,
                song=song,
                skip_album_art=self.settings["skip_album_art"],
            )

            logger.info(
                f"Updated metadata for {song.display_name}"
                f", moved to new location: {output_file}"
                if most_recent_duplicate
                else ""
            )

            display_progress_tracker.notify_complete()

            return song, output_file

        # Create the output directory if it doesn't exist
        output_file.parent.mkdir(parents=True, exist_ok=True)
        if song.download_url is None:
            display_progress_tracker.update("Getting download URL")
            download_url = self.search(song, display_progress_tracker)
        else:
            download_url = song.download_url

        # Initialize audio downloader
        audio_downloader: Union[AudioProvider, Piped]
        if self.settings["audio_providers"][0] == "piped":
            audio_downloader = Piped(
                output_format=self.settings["format"],
                cookie_file=self.settings["cookie_file"],
                search_query=self.settings["search_query"],
                filter_results=self.settings["filter_results"],
                yt_dlp_args=self.settings["yt_dlp_args"],
            )
        else:
            audio_downloader = AudioProvider(
                output_format=self.settings["format"],
                cookie_file=self.settings["cookie_file"],
                search_query=self.settings["search_query"],
                filter_results=self.settings["filter_results"],
                yt_dlp_args=self.settings["yt_dlp_args"],
            )

        logger.debug("Downloading %s using %s", song.display_name, download_url)

        # Add progress hook to the audio provider
        audio_downloader.audio_handler.add_progress_hook(
            display_progress_tracker.yt_dlp_progress_hook
        )

        download_info = audio_downloader.get_download_metadata(
            download_url, download=True
        )

        temp_file = Path(
            temp_folder / f"{download_info['id']}.{download_info['ext']}"
        )

        if download_info is None:
            logger.debug(
                "No download info found for %s, url: %s",
                song.display_name,
                download_url,
            )

            raise DownloaderError(
                f"yt-dlp failed to get metadata for: {song.name} - {song.artist}"
            )

        display_progress_tracker.notify_download_complete()

        # Copy the downloaded file to the output file
        # if the temp file and output file have the same extension
        # and the bitrate is set to auto or disable
        # Don't copy if the audio provider is piped
        # unless the bitrate is set to disable
        if (
            self.settings["bitrate"] in ["auto", "disable", None]
            and temp_file.suffix == output_file.suffix
        ) and not (
            self.settings["audio_providers"][0] == "piped"
            and self.settings["bitrate"] != "disable"
        ):
            shutil.move(str(temp_file), output_file)
            success = True
            result = None
        else:
            if self.settings["bitrate"] in ["auto", None]:
                # Use the bitrate from the download info if it exists
                # otherwise use `copy`
                bitrate = (
                    f"{int(download_info['abr'])}k"
                    if download_info.get("abr")
                    else "copy"
                )
            elif self.settings["bitrate"] == "disable":
                bitrate = None
            else:
                bitrate = str(self.settings["bitrate"])

            # Convert the downloaded file to the output format
            success, result = convert(
                input_file=temp_file,
                output_file=output_file,
                ffmpeg=self.ffmpeg,
                output_format=self.settings["format"],
                bitrate=bitrate,
                ffmpeg_args=self.settings["ffmpeg_args"],
                progress_handler=display_progress_tracker.ffmpeg_progress_hook,
            )

            if self.settings["create_skip_file"]:
                with open(
                    str(output_file) + ".skip", mode="w", encoding="utf-8"
                ) as _:
                    pass

        # Remove the temp file
        if temp_file.exists():
            try:
                temp_file.unlink()
            except (PermissionError, OSError) as exc:
                logger.debug(
                    "Could not remove temp file: %s, error: %s", temp_file, exc
                )

                raise DownloaderError(
                    f"Could not remove temp file: {temp_file}, possible duplicate song"
                ) from exc

        if not success and result:
            # If the conversion failed and there is an error message
            # create a file with the error message
            # and save it in the errors directory
            # raise an exception with file path
            file_name = (
                get_errors_path()
                / f"ffmpeg_error_{datetime.datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}.txt"
            )

            error_message = ""
            for key, value in result.items():
                error_message += f"### {key}:\n{str(value).strip()}\n\n"

            with open(file_name, "w", encoding="utf-8") as error_path:
                error_path.write(error_message)

            # Remove the file that failed to convert
            if output_file.exists():
                output_file.unlink()

            raise FFmpegError(
                f"Failed to convert {song.display_name}, "
                f"you can find error here: {str(file_name.absolute())}"
            )

        download_info["filepath"] = str(output_file)

        # Set the song's download url
        if song.download_url is None:
            song.download_url = download_url

        display_progress_tracker.notify_conversion_complete()

        # SponsorBlock post processor
        if self.settings["sponsor_block"]:
            # Initialize the sponsorblock post processor
            post_processor = SponsorBlockPP(
                audio_downloader.audio_handler, SPONSOR_BLOCK_CATEGORIES
            )

            # Run the post processor to get the sponsor segments
            _, download_info = post_processor.run(download_info)
            chapters = download_info["sponsorblock_chapters"]

            # If there are sponsor segments, remove them
            if len(chapters) > 0:
                logger.info(
                    "Removing %s sponsor segments for %s",
                    len(chapters),
                    song.display_name,
                )

                # Initialize the modify chapters post processor
                modify_chapters = ModifyChaptersPP(
                    downloader=audio_downloader.audio_handler,
                    remove_sponsor_segments=SPONSOR_BLOCK_CATEGORIES,
                )

                # Run the post processor to remove the sponsor segments
                # this returns a list of files to delete
                files_to_delete, download_info = modify_chapters.run(download_info)

                # Delete the files that were created by the post processor
                for file_to_delete in files_to_delete:
                    Path(file_to_delete).unlink()

        try:
            embed_metadata(
                output_file,
                song,
                id3_separator=self.settings["id3_separator"],
                skip_album_art=self.settings["skip_album_art"],
            )
        except Exception as exception:
            raise MetadataError(
                "Failed to embed metadata to the song"
            ) from exception

        if self.settings["generate_lrc"]:
            generate_lrc(song, output_file)

        display_progress_tracker.notify_complete()

        # Add the song to the known songs
        self.known_songs.get(song.url, []).append(output_file)

        logger.info('Downloaded "%s": %s', song.display_name, song.download_url)

        return song, output_file
    except (Exception, UnicodeEncodeError) as exception:
        if isinstance(exception, UnicodeEncodeError):
            exception_cause = exception
            exception = DownloaderError(
                "You may need to add PYTHONIOENCODING=utf-8 to your environment"
            )

            exception.__cause__ = exception_cause

        display_progress_tracker.notify_error(
            traceback.format_exc(), exception, True
        )
        self.errors.append(
            f"{song.url} - {exception.__class__.__name__}: {exception}"
        )
        return song, None

def search(self, song: Song, display_progress_tracker) -> str:
    """
    Search for a song using all available providers.

    ### Arguments
    - song: The song to search for.

    ### Returns
    - tuple with download url and audio provider if successful.
    """

    for audio_provider in self.audio_providers:
        display_progress_tracker.update(f"Searching in {audio_provider.name}")

        url = audio_provider.search(song, self.settings["only_verified_results"])
        if url:
            return url

        logger.debug("%s failed to find %s", audio_provider.name, song.display_name)

    raise LookupError(f"No results found for song: {song.display_name}")


spotdl.download.downloader.Downloader.search_and_download = search_and_download
spotdl.download.downloader.Downloader.search = search








logger = getLogger(__name__)
logger.info("Patches applied")