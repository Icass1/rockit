
from spotdl.types.song import Song as SpotdlSong

from flask import Flask, Response, request, jsonify
from flask_sock import Sock

from downloader import Downloader
from spotify import Spotify
from colors import *

app = Flask(__name__)
sock = Sock(app)

downloader = Downloader()
spotify = Spotify()

# print(song)

@app.route('/')
def home():
    return Response("OK")

@app.route('/search')
def search():

    query = request.args.get('q')
    out = spotify.spotify_search(query)




    # url = request.args.get('url')
    # print(OKBLUE, url, ENDC)
    # song = spotify.get_simple_songs(url)

    # return jsonify(song)
    return jsonify(out)

@app.route('/start-download')
def start_download():

    url = request.args.get('url')
    print(OKBLUE, url, ENDC)

    if "/track/" in url:
        song = SpotdlSong.from_url(url)
        print(song)
        downloader.download_song(song)
    else:
        res, list_info = spotify.get_simple_songs(url)

    return jsonify("OK")

@app.route('/download-status')
def download_status():
    pass

@app.route('/downloads')
def downloads():
    pass

@app.route('/cancel-download')
def cancel_download():
    pass

with app.app_context():
    # sock.init_app(app)
    app.run(host='0.0.0.0', port=8000, debug=True)
