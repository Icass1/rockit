

from flask import Flask, Response, request, jsonify
from flask_sock import Sock
from flask_cors import CORS

from downloader import Downloader
from spotify import Spotify
from colors import *
from utils import create_id

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

@app.route('/')
def home():
    return Response("OK")

@app.route('/search')
def search():

    query = request.args.get('q')
    out = spotify.spotify_search(query)
    
    return jsonify(out)

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
