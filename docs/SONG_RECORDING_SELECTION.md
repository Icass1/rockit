# Song recording selection after the S3 migration

## Storage and ownership

PR151 moved persistent media to S3-compatible storage. Provider rows reference
`core.storage_object` through `storage_object_id`; `ObjectFiles` handles upload
and temporary local copies. This change selects the recording **before** the
existing yt-dlp transfer and `ObjectFiles.upload_async` calls. Object keys, S3
configuration, upload paths, migrations and storage references are unchanged.
Selection belongs to `youtube/framework/youtubeSearch.py`, used by the YouTube
Music, Spotify and Spotify Scrapper download implementations. Core contains no
YouTube classification or matching rules. Explicit video downloads still use
the existing MP4 path.

## Findings and sources

Reviewed SpotDL commit `58ced9af69dce17d33ff280bafbcc917a9dba0aa`:

- [YTMusic audio provider](https://github.com/spotDL/spotify-downloader/blob/58ced9af69dce17d33ff280bafbcc917a9dba0aa/spotdl/providers/audio/ytmusic.py):
  searches catalogue songs before videos and marks song results as verified.
- [Audio provider orchestration](https://github.com/spotDL/spotify-downloader/blob/58ced9af69dce17d33ff280bafbcc917a9dba0aa/spotdl/providers/audio/base.py):
  tries ISRC, then metadata search and matching. ISRC search relevance is not a
  returned recording-identity guarantee.
- [Matching](https://github.com/spotDL/spotify-downloader/blob/58ced9af69dce17d33ff280bafbcc917a9dba0aa/spotdl/utils/matching.py):
  compares names, artists and duration and rejects unwanted version qualifiers.
- [ytmusicapi search contract](https://ytmusicapi.readthedocs.io/en/stable/reference/search.html):
  `filter="songs"` separates catalogue songs from video results; responses expose
  result type, artist credits and duration.
- [ytmusicapi browsing contract](https://ytmusicapi.readthedocs.io/en/stable/reference/browsing.html#ytmusicapi.YTMusic.get_song):
  player metadata includes the selected video's identity and music-video type.

SpotDL can fall back to videos. Rockit deliberately does not do this for a song
request: extracting only the audio stream of a videoclip preserves the clip's
intro, dialogue and alternate edit.

## Selection policy

1. Inspect a stored/direct URL when available. Retain it only when matching
   player metadata identifies it as an ATV art track, with matching identity.
2. Search songs by valid ISRC when present, then by title/artists/album if no
   usable match exists. Request exact spelling rather than autocorrection.
3. Require `resultType="song"`; accept ATV or absent video-type metadata from
   that song catalogue. Reject explicit OMV, UGC and other classifications.
4. Require normalized artist credits, a close title, compatible version markers
   and, when the requested duration is trustworthy, a difference no greater
   than 1.5%, with a 3-second minimum and 6-second maximum tolerance.
5. Preserve live/remix/acoustic/etc. recordings when requested; do not substitute
   them for the studio recording. Album agreement only ranks already valid
   matches. Presentation labels are removable; musical version labels remain.
6. If a YouTube Music source ID is positively identified as OMV/UGC, its clip
   duration is not used as a reference for the replacement catalogue recording.
7. Return at most three passing candidates. Every retry uses this same list;
   neither generic YouTube search nor old cached videoclip URLs bypass policy.

No acceptable match returns NOT_FOUND; a catalogue outage remains retryable.
This is deliberately conservative and can reject valid releases with inconsistent
artist credits or unavailable catalogue metadata. It is metadata matching, not an
audio fingerprint or a guarantee about the contents of every catalogue entry.
Existing downloaded objects are not rewritten or removed automatically.

## Cost and validation

At most one stored-ID inspection and two search operations (ISRC/text), with at
most ten results examined per query and three download candidates. HTTP requests
use a 10-second timeout, sessions are closed, blocking metadata calls run in worker
threads, and the existing YouTube pacing gate remains in force. No audio decoding,
waveform analysis, extra S3 reads or new service/dependency is introduced.

Regressions cover catalogue audio versus OMV/UGC, same-title/duration clips,
artist/version/duration mismatches, requested live recordings, stored videoclip
replacement, contaminated clip duration, ISRC fallback and catalogue outages.
They use provider payload fixtures; they do not claim live YouTube downloads or
validation against the user's Silo instance. No local test suites were run.
