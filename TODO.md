# RockIt ToDo

## Backend

-   Add queue to all downloads
-   Add downloader log to database
-   ✅ Download playlist
-   ✅ Download album
-   ✅ Download song
-   Notify the client when downloading song is in queue
-   If two songs have the same name -> must not be downloaded at the same time
-   Clean downloads_ids_dict downloads_dict after download
-   Cancel download
-   Change all database column names to camelCase
-   ✅ Handle .env missing
-   <span style="color:#3287a8">(Impr: Make songs crossover between them so it seems like endless)</span>
-   <span style="color:#3287a8">(Impr: When no one playing music -> Use WhisperAI to process songs)</span>
-   Fix "MetadataError: Failed to embed metadata to the song"
-   ✅ Migrate from Astro DB to SQLite3
-   ✅ Add logger
-   ✅ Redirect all backend routes through astro routes
-   Remove extra data download-status. (keep id,total,completed)
-   If frontend is not running, save the new-song, new-album etc into a temp folder so at some time, when it is running, all will be send at once
-   Download album and artits images

## Frontend

-   **Main Components** (Header, Footer, Menu Bar)

    -   ✅ Header
        -   ✅ Add logo on left
        -   ✅ Add search bar on middle
        -   ✅ Add user information & Profile pic on right
    -  ⌛ Footer
        -   ✅ Add song information on Left
            -   ✅ Cover
            -   ✅ Img
            -   ✅ Title
            -   ✅ Artist
                -   ✅ Link
            -   ✅ <span style="color:#3287a8">(Impr: Add Album next to artist?)</span>
                -   ✅ Link
        -   ✅ Add song & playlist control buttons on middle (Need to fix CSS)
        -  ✅ Add song times and bur under control buttons
            -   ✅ Total audio time
            -   ✅ Current audio time
            -  ✅ Progress bar
                -  ✅ Click on progress bar and change current audio time
        -  ⌛ Add volume control bar & icon on the right
            -   ✅ Icon and bar
            -  ⌛ Change audio volume
        -   ✅ <span style="color:#3287a8">(Impr: Add arrow up button to go to song full size player?)</span>
    -   Menu bar
        -   ✅ Add functional icons to menu bar
        -   ✅ <span style="color:#3287a8">(Impr: Add hover menu to display each icons name/page?)</span>
        -   <span style="color:#3287a8">(Impr: Add placeholders for top listened artists/ songs?)</span>
    -   General
        -   ✅ Placeholders for each components (Mockup)
        -   Replace Mockups wih real tags & functionalities

-   **Audio Player**

    -   ✅ Set song
    -   ✅ Play song
    -   ✅ Stop song
    -   Queue
        -   Set queue
        -   Set queue index
        -   Next song
        -   Previous song
    -   Set volume

-   **Song page**

    -   Album cover / Song Img
    -   Artist
        -   Link to artist view
    -   Duration
    -   Name
    -   Album
        -   Link to album view
        -   <span style="color:#3287a8">(Impr: Album songs?)</span>
        -   Name
        -   Release date

-   **Artist page**

    -   Artist name
    -   Genres
    -   Cover
    -   Most listened songs
        -   Name
        -   Album
    -   Albums
        -   Link to album
        -   Release date
        -   Name
    -   <span style="color:#3287a8">(Impr: Similar songs/artists?)</span>

-   **Album page**

    -   ✅ Album name
    -   ✅ Artist
    -   ✅ Release date
    -   ✅ Cover
    -   ✅ Number of songs
    -   Number of discs
    -   ✅ Total duration
    -   Genres
    -   Songs
        -   ✅ Name
        -   Artists if they are not the same as the artists on the album
        -   ✅ Duration

-   **Playlist page**

    -   ✅ Playlist name
    -   ✅ Creted by
    -   ✅ Cover
    -   ✅ Number of songs
    -   Total duration
    -   Genres
    -   ✅ Songs
        -   ✅ Name
        -   ✅ Album
        -   ✅ Duration
        -   ✅ Artists names

-   **User settings**

    -   ✅ User display name
    -   ✅ Change password
    -   ✅ Change display Image
    -   (Why/where this ones?)
        -   Most played songs
        -   Most played album
        -   Most played artist
        -   Most played genre

-   **Library**

    -   ✅ User albums - Need to add backend
        -   ✅ Liked songs
        -   ✅ Recent songs
        -   ✅ In the last x days most listened songs
    -   ✅ User playlists
    -   <span style="color:#3287a8">(Impr: Recommendations) - Could be added in fetured</span>
    -   <span style="color:#3287a8">(Impr: Recaps) - Could be added in fetured</span>

-   **Search**

    -   Best result

        -   If album
            -   Show if in database
            -   Click to download
            -   Album name
            -   Album artist
            -   Album cover
        -   If song
            -   Show if in database
            -   Click to download
            -   Song name
            -   Song artist
            -   Album cover
            -   Album name
        -   If playlist
            -   Show if in database
            -   Click to download
            -   Playlist name
            -   Cover
            -   Created by
        -   If Artist
            -   Cover
            -   Name

    -   Artists

        -   Cover
        -   Name

    -   Albums

        -   Show if in database
        -   Click to download
        -   Album name
        -   Album artist
        -   Album cover

    -   Songs

        -   Show if in database
        -   Click to download
        -   Song name
        -   Song artist
        -   Album cover
        -   Album name

    -   Playlists
        -   Show if in database
        -   Click to download
        -   Playlist name
        -   Cover
        -   Created by

-   **Home**

    -   ✅ Most played songs (if count > 10)
    -   ✅ Most played album (if count > 10)
    -   Most played artist (if count > 10)
    -   ✅ Recomendations
    -   ✅ Recently played song (Banner on top)
    -   ✅ Recently played album (Banner on top)

-   **Downloads**

    -   Downloads status
        -   Percentage
        -   Name of song or list
        -   Cover
        -   Artist
        -   Songs if list
        -   Cancel download
    -   Downloads history
        -   Name of song or list
        -   Cover
        -   Artist
        -   Songs if list
        -   Date downloaded

-   **Error page**
-   **Loading page**

-   **(Impr: Statistics between users page)**
