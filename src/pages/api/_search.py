


from spotdl import SpotifyClient
from spotdl.utils.config import SPOTIFY_OPTIONS, DOWNLOADER_OPTIONS
from spotdl.download.downloader import Downloader as SpotifyDownloader
import argparse


parser = argparse.ArgumentParser(
                    prog='Search',
                    description='What the program does',
                    epilog='Text at the bottom of help')

parser.add_argument('filename')
parser.add_argument('-c', '--count')
parser.add_argument('-v', '--verbose', action='store_true')

args = parser.parse_args()


SPOTIFY_OPTIONS["client_id"] = "ad536e690a7244ffbf5bad438a4c6ced"
SPOTIFY_OPTIONS["client_secret"] = "9eba0ac8a6a049e4b91c37772b16882a"

# -o output_dir
# -t threads
# --url Spotify url track/playlist/album


spotify_client = SpotifyClient.init(**SPOTIFY_OPTIONS)
spotify_downloader = SpotifyDownloader(SPOTIFY_OPTIONS)
spotify_downloader.download_song