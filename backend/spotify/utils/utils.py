from spotdl.types.song import Song as SpotdlSong  # type: ignore
from spotdl.utils.static import BAD_CHARS  # type: ignore
from spotdl.utils.formatter import create_file_name  # type: ignore

from backend.constants import DOWNLOADER_OPTIONS


def get_song_name(song: SpotdlSong):
    return "".join(
        char for char in song.display_name if char not in [chr(i) for i in BAD_CHARS]
    )


def get_output_file(song: SpotdlSong):
    return str(
        create_file_name(
            song=song,
            template=DOWNLOADER_OPTIONS["output"],
            file_extension=DOWNLOADER_OPTIONS["format"],
            restrict=DOWNLOADER_OPTIONS["restrict"],
            file_name_length=DOWNLOADER_OPTIONS["max_filename_length"],
        )
    )
