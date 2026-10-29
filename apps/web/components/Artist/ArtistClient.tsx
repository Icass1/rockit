"use client";

import {
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
    type CSSProperties,
    type JSX,
} from "react";
import Image from "next/image";
import Link from "next/link";
import type { ArtistPageResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { EEvent, EMediaContextLocation } from "@rockit/shared";
import {
    ArrowUpRight,
    Check,
    Download,
    LoaderCircle,
    MoreHorizontal,
    Play,
    Search,
} from "lucide-react";
import type { IMediaDownloadedEvent } from "@/models/interfaces/events/mediaDownloaded";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    artistAccent,
    getArtistPageAsync,
    getArtistPortrait,
    getServerArtistPortrait,
    playArtistSongs,
    subscribeArtistPortrait,
} from "@/lib/services/artistService";
import { getTime } from "@/lib/utils/getTime";
import { isPinnableMedia } from "@/lib/utils/navigationPins";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import "@/components/Artist/artist.css";
import ArtistMetadataClient from "@/components/Artist/ArtistMetadataClient";

export default function ArtistClient({
    initialPage,
    artistName,
}: {
    initialPage: ArtistPageResponse;
    artistName?: string;
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [page, setPage] = useState(initialPage);
    const [metadataPortrait, setMetadataPortrait] = useState("");
    const [collectionExpanded, setCollectionExpanded] = useState(false);
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
    const searchPortrait = useSyncExternalStore(
        subscribeArtistPortrait,
        () => getArtistPortrait(artist.name),
        getServerArtistPortrait
    );
    const [failedPortrait, setFailedPortrait] = useState("");
    const image =
        metadataPortrait && metadataPortrait !== failedPortrait
            ? metadataPortrait
            : artist.imageUrl || searchPortrait;
    const accent = artistAccent(artist.dominantColor, page.albums);
    async function loadMore(reset = false): Promise<void> {
        if (loading) return;
        setLoading(true);
        setFailed(false);
        try {
            const next = await getArtistPageAsync(
                artistName ? undefined : artist.publicId,
                artistName,
                reset ? 0 : page.offset + 100
            );
            if (!next) {
                setFailed(true);
                return;
            }
            setPage((current) => ({
                ...next,
                songs: reset ? next.songs : [...current.songs, ...next.songs],
                albums: reset
                    ? next.albums
                    : [...current.albums, ...next.albums],
            }));
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }
    return (
        <div
            className="artist-page"
            style={
                accent
                    ? ({
                          "--artist-accent": accent.rgb,
                          "--artist-accent-foreground": accent.foreground,
                      } as CSSProperties)
                    : undefined
            }
        >
            <header className="artist-stage">
                {image && (
                    <div className="artist-portrait">
                        <Image
                            src={image}
                            alt=""
                            fill
                            priority
                            sizes="(max-width: 720px) 100vw, (min-width: 2000px) 720px, 55vw"
                            className="object-cover"
                            onError={() => setFailedPortrait(image)}
                        />
                    </div>
                )}
                <div className="artist-intro">
                    <h1>{artist.name}</h1>
                    {(playable || isPinnableMedia(artist)) && (
                        <div className="artist-actions">
                            {playable && (
                                <button
                                    className="artist-play"
                                    disabled={!playable}
                                    onClick={() => playArtistSongs(songs)}
                                >
                                    <Play
                                        size={18}
                                        fill="currentColor"
                                        aria-hidden
                                    />
                                    {v.ARTIST_PLAY}
                                </button>
                            )}
                            {isPinnableMedia(artist) && (
                                <MediaContextMenu
                                    media={artist}
                                    location={EMediaContextLocation.HOME}
                                    openOnLeftClick
                                >
                                    <button
                                        type="button"
                                        className="artist-filter"
                                        aria-label={v.MORE_OPTIONS}
                                        title={v.MORE_OPTIONS}
                                    >
                                        <MoreHorizontal size={20} aria-hidden />
                                    </button>
                                </MediaContextMenu>
                            )}
                        </div>
                    )}
                </div>
            </header>
            <div className="artist-body">
                <ArtistMetadataClient
                    key={`${artist.publicId}:${artist.name}`}
                    name={artist.name}
                    onImageChange={setMetadataPortrait}
                    songs={page.songs}
                    albums={page.albums}
                    summary={
                        <>
                            {(page.totalSongs > 0 || page.totalAlbums > 0) && (
                                <span className="artist-inventory">
                                    <span>
                                        {page.totalSongs} {v.ARTIST_SONGS}
                                    </span>
                                    <span>
                                        {page.totalAlbums} {v.ARTIST_ALBUMS}
                                    </span>
                                </span>
                            )}
                        </>
                    }
                    localAlbums={
                        page.albums.length > 0 ? (
                            <div className="artist-albums artist-local-albums">
                                {page.albums.map((album) => (
                                    <Link
                                        key={album.publicId}
                                        href={`/album/${album.publicId}`}
                                        className="artist-album"
                                    >
                                        <Image
                                            src={
                                                album.imageUrl ||
                                                rockIt.SONG_PLACEHOLDER_IMAGE_URL
                                            }
                                            width={220}
                                            height={220}
                                            sizes="(max-width: 720px) 42vw, 180px"
                                            alt=""
                                        />
                                        <strong>{album.name}</strong>
                                        <span>
                                            {album.releaseDate?.slice(0, 4)}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        ) : undefined
                    }
                >
                    <section
                        aria-labelledby="artist-songs-title"
                        className="artist-songs"
                    >
                        <div className="artist-section-heading">
                            <h2 id="artist-songs-title">
                                {v.ARTIST_COLLECTION}
                            </h2>
                            {page.songs.length > 0 && (
                                <button
                                    className="artist-filter"
                                    aria-pressed={downloadedOnly}
                                    onClick={() =>
                                        setDownloadedOnly(!downloadedOnly)
                                    }
                                >
                                    <Download size={16} aria-hidden />
                                    {v.ARTIST_DOWNLOADED}
                                    {downloadedOnly && (
                                        <Check size={15} aria-hidden />
                                    )}
                                </button>
                            )}
                        </div>
                        {page.songs.length > 0 && (
                            <label
                                className="artist-search"
                                htmlFor="artist-song-search"
                            >
                                <Search size={17} aria-hidden />
                                <input
                                    id="artist-song-search"
                                    type="search"
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    placeholder={v.ARTIST_SEARCH}
                                />
                            </label>
                        )}
                        <ol className="artist-tracklist">
                            {(collectionExpanded || query || downloadedOnly
                                ? songs
                                : songs.slice(0, 5)
                            ).map((song, index) => (
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
                                                        .map(
                                                            (item) => item.name
                                                        )
                                                        .join(", ")}
                                            </span>
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
                                                    aria-label={
                                                        v.ARTIST_DOWNLOADED
                                                    }
                                                />
                                            ) : (
                                                <Download
                                                    size={14}
                                                    aria-label={
                                                        v.ARTIST_DOWNLOAD
                                                    }
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
                        {songs.length > 5 && !query && !downloadedOnly && (
                            <button
                                className="artist-text-action"
                                onClick={() =>
                                    setCollectionExpanded(!collectionExpanded)
                                }
                            >
                                {collectionExpanded
                                    ? v.ARTIST_LESS
                                    : v.ARTIST_MORE}
                            </button>
                        )}
                        {!songs.length && (
                            <p className="artist-empty">
                                {query || downloadedOnly
                                    ? v.ARTIST_NO_MATCHES
                                    : page.partial
                                      ? v.ERROR_GETTING_MEDIA
                                      : v.ARTIST_COLLECTION_EMPTY}
                                {page.partial && (
                                    <button
                                        className="artist-text-action"
                                        disabled={loading}
                                        onClick={() => void loadMore(true)}
                                    >
                                        {v.RETRY}
                                    </button>
                                )}
                            </p>
                        )}
                    </section>
                </ArtistMetadataClient>
                {page.relatedArtists.length > 0 && (
                    <section className="artist-related">
                        <h2>{v.ARTIST_RELATED}</h2>
                        {page.relatedArtists.map((related) => (
                            <Link
                                key={related.publicId}
                                href={`/artist/${related.publicId}`}
                            >
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
            </div>
        </div>
    );
}
