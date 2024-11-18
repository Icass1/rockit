
from flask import Flask, Response, request, jsonify
from flask_sock import Sock
from flask_cors import CORS

from colors import *

from spotify import Spotify
from downloader import Downloader
from utils import create_id
from logger import getLogger

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

USER_ID = "randomtestuserid"

downloads = {}

logger = getLogger(__name__)

app.logger = logger

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

@app.route('/start-download')
def start_download():    
    url = request.args.get('url')
    download_id = create_id(length=16)

    if USER_ID not in downloads:
        downloads[USER_ID] = {}

    downloads[USER_ID][download_id] = downloader.download_url(url)

    return jsonify({"download_id": download_id})

@app.route('/download-status/<string:id>')
def download_status(id: str):
    
    if USER_ID not in downloads or id not in downloads[USER_ID]:
        return Response("Download not found"), 404

    return Response(downloads[USER_ID][id].status(), mimetype='text/event-stream')

@app.route('/downloads')
def check_downloads():
    if USER_ID not in downloads:
        return Response("User doesn't have any downloads"), 404
    
    return jsonify(list(downloads[USER_ID].keys()))


@app.route('/cancel-download')
def cancel_download():
    pass

with app.app_context():
    # sock.init_app(app)
    app.run(host='0.0.0.0', port=8000, debug=True)
