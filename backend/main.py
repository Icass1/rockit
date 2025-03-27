
from flask import Flask, Response, request, jsonify, render_template
from flask_sock import Sock
from flask_cors import CORS

from dotenv import load_dotenv
import os
from typing import Dict
import json
from functools import wraps

load_dotenv(override=True)

environ_variables = ["ENVIRONMENT", "CLIENT_ID", "CLIENT_SECRET", "FRONTEND_URL", "SONGS_PATH", "TEMP_PATH", "LOGS_PATH", "IMAGES_PATH", "API_KEY", "DOWNLOAD_THREADS", "LOG_DUMP_LEVEL"]

for variable in environ_variables:
    if not os.getenv(variable):
        print(f"\033[91m{variable} is not set, make sure all variables in example.env are set in .env file.\033[0m")
        exit()

from spotify import Spotify
from downloader import Downloader, SongDownloader, ListDownloader
from backendUtils import create_id
from logger import getLogger

from db.db import DB

import auth

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

db = DB()

spotify = Spotify(db)
downloader = Downloader(spotify)

downloads = {}
user_downloads: Dict[str, Dict[str, SongDownloader | ListDownloader | None]] = {}

logger = getLogger(__name__)

def require_api_key(func):
    return func
    API_KEY = os.getenv("API_KEY")
    
    @wraps(func)
    def decorated(*args, **kwargs):
        if request.headers.get("Authorization").replace("Bearer ", "") == API_KEY:
            print("A")
            return func(*args, **kwargs)
        else:
            print("B")
            return Response("Authorization missing", status=401)
            
    return decorated

@app.route('/')
def home():

    queue = []
    for k in downloader.queue:
        
        raw_list = k.get("raw_list")
        raw_song = k.get("raw_song")
        
        if not raw_list or not raw_song: continue
        
        queue.append({
            "spotdl_song": k.get("spotdl_song").json,
            "raw_list": raw_list._json,   
            "raw_song": raw_song._json
        })

    return render_template(
        "index.html",
        queue=json.dumps(queue, indent=4), 
        downloads_ids_dict=json.dumps(downloader.downloads_ids_dict, indent=4)
    )

# Route to handle login (with session management)
@app.route('/auth/login', methods=['POST'])
@require_api_key
def login():
    if not request.json: return Response("JSON not defined")
    
    username = request.json.get('username')
    password = request.json.get('password')

    # Assuming you have a function to check user credentials
    user = auth.check_user_credentials(db=db, username=username, password=password)
    if user:
        user_id = user['id']
        # Create session and return session id
        session_id = auth.create_session(db=db, user_id=user_id)
        return jsonify({'message': 'Login successful', 'session_id': session_id})
    else:
        return jsonify({'message': 'Invalid credentials'}), 401

# Route to handle logout (delete session)
@app.route('/auth/logout', methods=['POST'])
@require_api_key
def logout():
    if not request.json: return Response("JSON not defined")
    
    session_id = request.json.get('session_id')
    auth.delete_session(db, session_id)
    return jsonify({'message': 'Logged out successfully'})

@app.route('/auth/get-user', methods=['POST'])
@require_api_key
def get_user():
    if not request.json: return Response("JSON not defined")
    
    session_id = request.json.get('session_id')
    params = request.json.get('params')
    
    if params:
        params = ",".join(params)
    else:
        params = "*"
        
    session = db.get(query="SELECT user_id FROM session WHERE id = ?", parameters=(session_id,))
    
    if not session:
        return Response("Session not found"), 401
    
    user = db.get(query=f"SELECT {params} FROM user WHERE id = ?", parameters=(session["user_id"],))
    if not user:
        return Response("User not found"), 401
    
    return jsonify(user)

@app.route('/db/get', methods=["POST"])
@require_api_key
def db_get_request():# -> dict[str, Any]:
    if not request.json: return Response("JSON not defined")
    
    query = request.json.get('query')
    params = request.json.get('params')
    
    result = db.get(query=query, parameters=params)

    # print(result)

    return jsonify(result)

@app.route('/db/all', methods=["POST"])
@require_api_key
def db_all_request():# -> dict[str, Any]:
    if not request.json: return Response("JSON not defined")
    
    query = request.json.get('query')
    params = request.json.get('params')
    
    result = db.get_all(query=query, parameters=params)

    # print(result)

    return jsonify(result)

@app.route('/db/run', methods=["POST"])
@require_api_key
def db_run_request():# -> dict[str, Any]:
    if not request.json: return Response("JSON not defined")
    
    query = request.json.get('query')
    params = request.json.get('params')
        
    db.execute(query=query, parameters=params)

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
    return jsonify(spotify.get_album(id, force_spotify_request=True))

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
    
    return jsonify(spotify.get_song(id, force_spotify_request=True))

@app.route('/start-download')
def start_download():    
    USER_ID = request.args.get('user')
    if USER_ID == None: return Response("User is not logged in"), 401
    
    url = spotify.parse_url(request.args.get('url'))
    download_id = create_id(length=16)

    if USER_ID not in user_downloads:
        user_downloads[USER_ID] = {}

    if url in downloads:
        logger.debug("main.start_download Handler already started")
        download_handler = downloads[url]
    else:
        logger.debug("main.start_download Starting new handler")
        download_handler = downloader.download_url(url, user_id=USER_ID, download_id=download_id)
        downloads[url] = download_handler
        
    print("USER_ID", USER_ID)
    print("download_id", download_id)
    print("url", url)
    print("user_downloads", user_downloads)
    print("downloads", downloads)
    print("download_handler", download_handler)
    
    if download_handler:
        user_downloads[USER_ID][download_id] = download_handler
        return jsonify({"download_id": download_id})
    else:
        return Response("Error starting download")

@app.route('/download-status/<string:id>')
def download_status(id: str):
    USER_ID = request.args.get('user')
    if USER_ID == None: return Response("User is not logged in"), 401
    
    if USER_ID not in user_downloads or id not in user_downloads[USER_ID]:
        return Response("Download not found"), 404

    if user_downloads[USER_ID][id] == None:
        return Response("Error in download"), 500

    download_handler = user_downloads[USER_ID][id]

    if not download_handler: return Response("Download handler not found"), 401

    return Response(download_handler.status(), mimetype='text/event-stream')

@app.route('/downloads')
def check_downloads():
    USER_ID = request.args.get('user')
    if USER_ID == None: return Response("User is not logged in"), 401

    if USER_ID not in user_downloads:
        return jsonify([])
    
    return jsonify(list(user_downloads[USER_ID].keys()))

@app.route('/global-downloads')
def global_downloads():
    out = {}
    for k in user_downloads.keys():
        out[k] = {}
        for i in user_downloads[k].keys():
            out[k][i] = str(user_downloads[k][i])
    return jsonify(out)

@app.route('/downloads-dict')
def downloads_dict():
    return jsonify(downloader.downloads_dict)

@app.route('/downloads-ids-dict')
def downloads_ids_dict():
    return jsonify(downloader.downloads_ids_dict)

@app.route('/cancel-download')
def cancel_download():
    return "TODO"
    pass

if os.getenv("ENVIRONMENT") == "DEV":
    with app.app_context():
        app.run(host='0.0.0.0', port=8000, debug=False)

elif os.getenv("ENVIRONMENT") == "PROD":
    with app.app_context():
        if __name__ == '__main__':
            app.run(host='0.0.0.0', port=8000)
