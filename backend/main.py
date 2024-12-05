
from flask import Flask, Response, request, jsonify
from flask_sock import Sock
from flask_cors import CORS

from dotenv import load_dotenv
load_dotenv()
import os

environ_variables = ["ENVIRONMENT", "CLIENT_ID", "CLIENT_SECRET", "FRONTEND_URL", "SONGS_PATH", "TEMP_PATH", "LOGS_PATH", "IMAGES_PATH"]

for variable in environ_variables:
    if not os.getenv(variable):
        print(f"{variable} is not set")
        exit()


from spotify import Spotify
from downloader import Downloader, SongDownloader, ListDownloader
from utils import create_id
from logger import getLogger

from typing import Dict


app = Flask(__name__)
sock = Sock(app)

CORS(app, supports_credentials=True, resources={
    r"/*": {
        "origins": "*"  # Replace with your allowed origin
    },
    r"*": {
        "origins": "*"  # Replace with your allowed origin
    }
})


spotify = Spotify()
downloader = Downloader(spotify)

# USER_ID = "randomtestuserid"

# downloads: Dict[str, SongDownloader | ListDownloader | None] = {}
downloads: Dict[str, Dict[str, SongDownloader | ListDownloader | None]] = {}

logger = getLogger(__name__)

app.logger = logger

import os
print("FRONTEND_URL", os.getenv('FRONTEND_URL'))


@app.route('/')
def home():
    return Response("OK")

@app.route('/search')
def search():

    query = request.args.get('q')
    
    search_results = spotify.api_call(path="search", params={"q": query, "type": "track,album,playlist,artist", "limit": "6"})

    return {
        "songs": search_results["tracks"]["items"],
        "albums": search_results["albums"]["items"],
        "playlists": search_results["playlists"]["items"],
        "artists": search_results["artists"]["items"],
    }

@app.route('/album/<string:id>')
def album(id: str):

    album = spotify.api_call(path=f"albums/{id}")

    return jsonify(album)

@app.route('/artist-top-songs/<string:id>')
def artist_top_songs(id: str):

    top_songs = spotify.api_call(path=f"artists/{id}/top-tracks")

    return jsonify(top_songs)

@app.route('/artist/<string:id>')
def artist(id: str):

    artist = spotify.api_call(path=f"artists/{id}")
    
    return jsonify(artist)

@app.route('/song/<string:id>')
def song(id: str):

    song = spotify.api_call(path=f"tracks/{id}")
    
    return jsonify(song)

@app.route('/start-download')
def start_download():    
    USER_ID = request.args.get('user')
    if USER_ID == None: return Response("User is not logged in"), 401
    
    url = request.args.get('url')
    download_id = create_id(length=16)

    if USER_ID not in downloads:
        downloads[USER_ID] = {}

    download_handler = downloader.download_url(url)
    if download_handler:
        downloads[USER_ID][download_id] = download_handler
        return jsonify({"download_id": download_id})
    else:
        return Response("Error starting download")

@app.route('/download-status/<string:id>')
def download_status(id: str):
    USER_ID = request.args.get('user')
    if USER_ID == None: return Response("User is not logged in"), 401
    
    if USER_ID not in downloads or id not in downloads[USER_ID]:
        return Response("Download not found"), 404

    if downloads[USER_ID][id] == None:
        return Response("Error in download"), 500

    return Response(downloads[USER_ID][id].status(), mimetype='text/event-stream')

@app.route('/downloads')
def check_downloads():
    USER_ID = request.args.get('user')
    if USER_ID == None: return Response("User is not logged in"), 401

    if USER_ID not in downloads:
        return jsonify([])
    
    return jsonify(list(downloads[USER_ID].keys()))

@app.route('/global-downloads')
def global_downloads():
    out = {}
    for k in downloads.keys():
        out[k] = {}
        for i in downloads[k].keys():
            out[k][i] = str(downloads[k][i])
    return jsonify(out)

@app.route('/cancel-download')
def cancel_download():
    pass

if os.getenv("ENVIRONMENT") == "DEV":
    with app.app_context():
        app.run(host='0.0.0.0', port=8000, debug=True)

elif os.getenv("ENVIRONMENT") == "PROD":
    with app.app_context():
        if __name__ == '__main__':
            app.run(host='0.0.0.0', port=8000, debug=True)
