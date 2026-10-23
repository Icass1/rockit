"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStore } from "@nanostores/react";
import {
    ArrowUpRight,
    Check,
    Download,
    LoaderCircle,
    Play,
    Search,
} from "lucide-react";
import { EEvent } from "@rockit/shared";
import type { IMediaDownloadedEvent } from "@/models/interfaces/events/mediaDownloaded";
import type { ArtistPageResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    getArtistPageAsync,
    playArtistSongs,
} from "@/lib/services/artistService";
import { getTime } from "@/lib/utils/getTime";
import "@/components/Artist/artist.css";

export default function ArtistClient({
    initialPage,
    artistName,
}: {
    initialPage: ArtistPageResponse;
    artistName?: string;
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [page, setPage] = useState(initialPage);
    const [query, setQuery] = useState("");
    const [downloadedOnly, setDownloadedOnly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let active = true;
        const handleDownloaded = (event: IMediaDownloadedEvent): void => {
            if (!page.songs.some((song) => song.publicId === event.publicId))
                return;
            void rockIt.mediaManager
                .getMedia(event.publicId)
                .then((result) => {
                    if (
                        !active ||
                        !result.isOk() ||
                        result.result.media.type !== "song"
                    )
                        return;
                    const updated = result.result.media;
                    setPage((current) => ({
                        ...current,
                        songs: current.songs.map((song) =>
                            song.publicId === updated.publicId ? updated : song
                        ),
                    }));
                })
                .catch(() => {
                    /* A later reload can recover a missed download update. */
                });
        };
        rockIt.eventManager.addEventListener(
            EEvent.MediaDownloaded,
            handleDownloaded
        );
        return () => {
            active = false;
            rockIt.eventManager.removeEventListener(
                EEvent.MediaDownloaded,
                handleDownloaded
            );
        };
    }, [page.songs]);
    const { artist } = page;
    const songs = useMemo(
        () =>
            page.songs.filter(
                (song) =>
                    (!downloadedOnly || song.downloaded) &&
                    song.name
                        .toLocaleLowerCase()
                        .includes(query.toLocaleLowerCase())
            ),
        [page.songs, downloadedOnly, query]
    );
    const playable = songs.some((song) => song.downloaded && song.audioUrl);
    const image =
        artist.imageUrl || page.songs[0]?.imageUrl || page.albums[0]?.imageUrl;
    async function loadMore(): Promise<void> {
        if (loading) return;
        setLoading(true);
        setFailed(false);
        try {
            const next = await getArtistPageAsync(
                artistName ? undefined : artist.publicId,
                artistName,
                page.offset + 100
            );
            if (!next) {
                setFailed(true);
                return;
            }
            setPage((current) => ({
                ...next,
                songs: [...current.songs, ...next.songs],
                albums: [...current.albums, ...next.albums],
            }));
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="artist-page">
            <header className="artist-stage">
                {image && (
                    <div className="artist-portrait">
                        <Image
                            src={image}
                            alt=""
                            fill
                            priority
                            sizes="(max-width: 720px) 100vw, 65vw"
                            className="object-cover"
                        />
                    </div>
                )}
                <div className="artist-intro">
                    <h1>{artist.name}</h1>
                    <p className="artist-inventory">
                        <span>
                            {page.totalSongs} {v.ARTIST_SONGS}
                        </span>
                        <span>
                            {page.totalAlbums} {v.ARTIST_ALBUMS}
                        </span>
                    </p>
                    <div className="artist-actions">
                        <button
                            className="artist-play"
                            disabled={!playable}
                            onClick={() => playArtistSongs(songs)}
                        >
                            <Play size={18} fill="currentColor" aria-hidden />
                            {v.ARTIST_PLAY}
                        </button>
                        {artist.providerUrl && (
                            <Link
                                href={artist.providerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="artist-source"
                            >
                                {v.ARTIST_SOURCE} {artist.provider}
                                <ArrowUpRight size={16} aria-hidden />
                            </Link>
                        )}
                    </div>
                </div>
            </header>
            <div className="artist-body">
                {page.partial && (
                    <p className="artist-notice" role="status">
                        {v.ARTIST_PARTIAL}
                    </p>
                )}
                <section
                    aria-labelledby="artist-songs-title"
                    className="artist-songs"
                >
                    <div className="artist-section-heading">
                        <h2 id="artist-songs-title">{v.ARTIST_COLLECTION}</h2>
                        <button
                            className="artist-filter"
                            aria-pressed={downloadedOnly}
                            onClick={() => setDownloadedOnly(!downloadedOnly)}
                        >
                            <Download size={16} aria-hidden />
                            {v.ARTIST_DOWNLOADED}
                            {downloadedOnly && <Check size={15} aria-hidden />}
                        </button>
                    </div>
                    <label
                        className="artist-search"
                        htmlFor="artist-song-search"
                    >
                        <Search size={17} aria-hidden />
                        <input
                            id="artist-song-search"
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={v.ARTIST_SEARCH}
                        />
                    </label>
                    <ol className="artist-tracklist">
                        {songs.map((song, index) => (
                            <li key={song.publicId}>
                                <button
                                    className="artist-track"
                                    onClick={() =>
                                        song.downloaded
                                            ? playArtistSongs(
                                                  songs,
                                                  song.publicId
                                              )
                                            : void rockIt.downloaderManager.downloadMediaAsync(
                                                  [song.publicId],
                                                  song.name
                                              )
                                    }
                                    aria-label={`${song.downloaded ? v.ARTIST_PLAY : v.ARTIST_DOWNLOAD}: ${song.name}`}
                                >
                                    <span className="artist-track-number">
                                        {index + 1}
                                    </span>
                                    <Image
                                        src={
                                            song.imageUrl ||
                                            rockIt.SONG_PLACEHOLDER_IMAGE_URL
                                        }
                                        width={44}
                                        height={44}
                                        alt=""
                                    />
                                    <span className="artist-track-info">
                                        <strong>{song.name}</strong>
                                        <span>
                                            {song.album.name ||
                                                song.artists
                                                    .map((item) => item.name)
                                                    .join(", ")}
                                        </span>
                                    </span>
                                    <span className="artist-track-provider">
                                        {song.provider}
                                    </span>
                                    <span
                                        className="artist-track-status"
                                        title={
                                            song.downloaded
                                                ? v.ARTIST_DOWNLOADED
                                                : v.ARTIST_DOWNLOAD
                                        }
                                    >
                                        {song.downloaded ? (
                                            <Check
                                                size={14}
                                                aria-label={v.ARTIST_DOWNLOADED}
                                            />
                                        ) : (
                                            <Download
                                                size={14}
                                                aria-label={v.ARTIST_DOWNLOAD}
                                            />
                                        )}
                                    </span>
                                    <span className="artist-duration">
                                        {getTime(song.duration_ms / 1000)}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ol>
                    {!songs.length && (
                        <p className="artist-empty">
                            {query || downloadedOnly
                                ? v.ARTIST_NO_MATCHES
                                : v.ARTIST_EMPTY}
                        </p>
                    )}
                </section>
                <section
                    aria-labelledby="artist-albums-title"
                    className="artist-discography"
                >
                    <h2 id="artist-albums-title">{v.ARTIST_DISCOGRAPHY}</h2>
                    <div className="artist-albums">
                        {page.albums.map((album) => (
                            <Link
                                key={album.publicId}
                                href={album.url || `/album/${album.publicId}`}
                                className="artist-album"
                            >
                                <Image
                                    src={
                                        album.imageUrl ||
                                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                                    }
                                    width={320}
                                    height={320}
                                    sizes="(max-width: 720px) 42vw, 220px"
                                    alt=""
                                />
                                <strong>{album.name}</strong>
                                <span>
                                    {album.releaseDate?.slice(0, 4)}
                                    <span>{album.provider}</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                    {!page.albums.length && (
                        <p className="artist-empty">{v.ARTIST_NO_ALBUMS}</p>
                    )}
                </section>
                {page.relatedArtists.length > 0 && (
                    <section className="artist-related">
                        <h2>{v.ARTIST_RELATED}</h2>
                        {page.relatedArtists.map((related) => (
                            <Link key={related.publicId} href={related.url}>
                                {related.name}
                                <ArrowUpRight size={18} aria-hidden />
                            </Link>
                        ))}
                    </section>
                )}
                {failed && (
                    <p className="artist-notice" role="alert">
                        {v.ARTIST_LOAD_ERROR}
                    </p>
                )}
                {page.hasMore && (
                    <button
                        className="artist-more"
                        disabled={loading}
                        onClick={() => void loadMore()}
                    >
                        {loading && <LoaderCircle size={16} aria-hidden />}
                        {loading ? v.ARTIST_LOADING : v.ARTIST_MORE}
                    </button>
                )}
                <p className="artist-footnote">{v.ARTIST_LOCAL_NOTE}</p>
            </div>
        </div>
    );
}
