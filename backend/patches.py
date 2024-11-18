import spotdl.providers.audio.base

import requests
from typing import Dict, List, Tuple
from bs4 import BeautifulSoup

import logging
from typing import Dict, List, Optional, Tuple


from spotdl.types.result import Result
from spotdl.types.song import Song
from spotdl.utils.formatter import (
    args_to_ytdlp_options,
    create_search_query,
    create_song_title,
)
from spotdl.utils.matching import get_best_matches, order_results

__all__ = ["AudioProviderError", "AudioProvider", "ISRC_REGEX", "YTDLLogger"]

logger = logging.getLogger(__name__)


from difflib import SequenceMatcher

from logger import getLogger


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






logger = getLogger(__name__)
logger.info("Patches applied")