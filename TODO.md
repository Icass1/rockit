# RockIt ToDo

## Backend
- Add queue to all downloads
- Add downloader log to database
- ✅ Download playlist
- ✅ Download album
- ✅ Download song
- Notify the client when downloading song is in queue
- If two songs have the same name -> must not be downloaded at the same time
- Clean downloads_ids_dict downloads_dict after download
- Cancel download
- Change all database column names to camelCase
- Handle .env missing
- <span style="color:#3287a8">(Impr: Make songs crossover between them so it seems like endless)</span>

## Frontend
- **Main Components** (Header, Footer, Menu Bar)
  - ✅ Header
    - ✅ Add logo on left
    - ✅ Add search bar on middle
    - ✅ Add user information & Profile pic on right
  - Footer
    - ✅ Add song information on Left 
      - ✅ Cover
      - ✅ Img
      - ✅ Title
      - ✅ Artist
      - ✅ <span style="color:#3287a8">(Impr: Add Album next to artist?)</span>
    - ✅ Add song & playlist control buttons on middle (Need to fix CSS)
    - ✅ Add song times and bur under control buttons (Need to fix Bar)
    - ✅ Add volume control bar & icon on the right
    - <span style="color:#3287a8">(Impr: Add arrow up button to go to song full size player?)</span>
  - Menu bar
    - ✅ Add functional icons to menu bar
    - ✅<span style="color:#3287a8">(Impr: Add hover menu to display each icons name/page?)</span>
    - <span style="color:#3287a8">(Impr: Add placeholders for top listened artists/ songs?)</span>
  - General
    - ✅ Placeholders for each components (Mockup)
    - Replace Mockups wih real tags & functionalities

- **Audio Player**
  - Set song
  - Play song
  - Stop song
  - Queue
    - Set queue
    - Set queue index
    - Next song
    - Previous song
  - Set volume

- **Song page**
  - Album cover / Song Img
  - Artist
    - Link to artist view
  - Duration
  - Name
  - Album
    - Link to album view
    - <span style="color:#3287a8">(Impr: Album songs?)</span>
    - Name
    - Release date

- **Artist page**
  - Artist name
  - Genres
  - Cover
  - Most listened songs
    - Name
    - Album
  - Albums
    - Link to album
    - Release date
    - Name
  - <span style="color:#3287a8">(Impr: Similar songs/artists?)</span>

- **Album page**
  - Album name
  - Artist
  - Release date
  - Cover
  - Number of songs
  - Number of discs
  - Total duration
  - Genres
  - Songs
    - Name
    - Artists if they are not the same as the artists on the album
    - Duration

- **Playlist page**
  - Playlist name
  - Creted by
  - Cover
  - Number of songs
  - Total duration
  - Genres
  - Songs
    - Name
    - Album
    - Duration
    - Artists names

- **User settings**
  - User display name
  - Change password
  - (Why/where this ones?)
    - Most played songs
    - Most played album
    - Most played artist
    - Most played genre

- **Library**
  - User albums
    - Liked songs
    - Recent songs 
    - In the last x days most listened songs
  - User playlists
  - <span style="color:#3287a8">(Impr: Recommendations?)</span>
  - <span style="color:#3287a8">(Impr: Recaps?)</span>

- **Search**
  - Best result
    - If album
      - Show if in database
      - Click to download
      - Album name
      - Album artist
      - Album cover
    - If song
      - Show if in database
      - Click to download
      - Song name
      - Song artist
      - Album cover
      - Album name
    - If playlist
      - Show if in database
      - Click to download
      - Playlist name
      - Cover
      - Created by
    - If Artist
      - Cover
      - Name

  - Artists
    - Cover
    - Name

  - Albums
    - Show if in database
    - Click to download
    - Album name
    - Album artist
    - Album cover

  - Songs
    - Show if in database
    - Click to download
    - Song name
    - Song artist
    - Album cover
    - Album name

  - Playlists
    - Show if in database
    - Click to download
    - Playlist name
    - Cover
    - Created by

- **Home**
  - Most played song (if count > 10)
  - Most played album (if count > 10)
  - Most played artist (if count > 10)
  - Recomendations
  - Recently played song
  - Recently played album

- **Downloads**
  - Downloads status
    - Percentage
    - Name of song or list
    - Cover
    - Artist
    - Songs if list
    - Cancel download
  - Downloads history
    - Name of song or list
    - Cover
    - Artist
    - Songs if list
    - Date downloaded

- **Error page**
- **Loading page**

- **(Impr: Statistics between users page)**