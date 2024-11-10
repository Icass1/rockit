from spotdl.utils.static import BAD_CHARS
from spotdl.utils.config import DOWNLOADER_OPTIONS
from spotdl.utils.formatter import create_file_name

import random

def get_output_file(song):
    return str(create_file_name(
        song=song,
        template=DOWNLOADER_OPTIONS["output"],
        file_extension=DOWNLOADER_OPTIONS["format"],
        restrict=DOWNLOADER_OPTIONS["restrict"],
        file_name_length=DOWNLOADER_OPTIONS["max_filename_length"],
    ))

def get_song_name(song):
    return "".join(
        char
        for char in song.display_name
        if char not in [chr(i) for i in BAD_CHARS]
    )

def create_id(length=16):

    alphabet = [
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
    ]

    random.shuffle(alphabet)
    return "".join(alphabet[0:length])