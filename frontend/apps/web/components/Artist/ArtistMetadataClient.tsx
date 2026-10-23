"use client";

import {
    useCallback,
    useEffect,
    useState,
    type JSX,
    type ReactNode,
} from "react";
import Link from "next/link";
import type {
    ArtistMetadataCatalog,
    ArtistMetadataIdentity,
    ArtistPageResponse,
} from "@/dto";
import { useStore } from "@nanostores/react";
import { ChevronRight, Download, LoaderCircle, Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    artistSearchUrl,
    findArtistMetadata,
    getArtistMetadataCatalog,
    getArtistMetadataProfile,
    matchArtistCatalogItem,
    normalizeArtistName,
    partitionArtistEvents,
} from "@/lib/services/artistMetadataService";
import { playArtistSongs } from "@/lib/services/artistService";
import ArtistSources from "@/components/Artist/ArtistSources";

export default function ArtistMetadataClient({
    name,
    songs,
    albums,
    children,
    localAlbums,
}: {
    name: string;
    songs: ArtistPageResponse["songs"];
    albums: ArtistPageResponse["albums"];
    children: ReactNode;
    localAlbums?: ReactNode;
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [candidates, setCandidates] = useState<ArtistMetadataIdentity[]>([]);
    const [selected, setSelected] = useState("");
    const [showRecordings, setShowRecordings] = useState(false);
    const [searching, setSearching] = useState(true);
    const [searchFailed, setSearchFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [profile, setProfile] =
        useState<Awaited<ReturnType<typeof getArtistMetadataProfile>>>();
    const [profileFailed, setProfileFailed] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);

    const chooseArtist = useCallback((id: string): void => {
        setProfile(undefined);
        setProfileFailed(false);
        setProfileLoading(Boolean(id));
        setSelected(id);
    }, []);
    function retrySearch(): void {
        setSearching(true);
        setSearchFailed(false);
        setCandidates([]);
        chooseArtist("");
        setAttempt((current) => current + 1);
    }
    useEffect(() => {
        let active = true;
        void findArtistMetadata(name)
            .then((items) => {
                if (!active) return;
                setCandidates(items);
                const exact = items.filter(
                    (item) =>
                        normalizeArtistName(item.name) ===
                        normalizeArtistName(name)
                );
                // Prefer exact names; provider order reflects search relevance,
                // not popularity. Keep the chooser available for corrections.
                const best = exact[0] ?? items[0];
                if (best) chooseArtist(best.id);
            })
            .catch(() => {
                if (active) setSearchFailed(true);
            })
            .finally(() => {
                if (active) setSearching(false);
            });
        return () => {
            active = false;
        };
    }, [name, attempt, chooseArtist]);

    useEffect(() => {
        let active = true;
        if (!selected) return;
        void getArtistMetadataProfile(selected)
            .then((result) => {
                if (active) setProfile(result);
            })
            .catch(() => {
                if (active) setProfileFailed(true);
            })
            .finally(() => {
                if (active) setProfileLoading(false);
            });
        return () => {
            active = false;
        };
    }, [selected, attempt]);

    const { upcoming, past } = partitionArtistEvents(profile?.events ?? []);
    return (
        <div className="artist-content">
            <div className="artist-about">
                {profile && (
                    <>
                        <p className="artist-context">{profile.description}</p>
                        {!!profile.genres.length && (
                            <p className="artist-genres">
                                {profile.genres.slice(0, 4).join(" · ")}
                            </p>
                        )}
                    </>
                )}
                {searching && (
                    <p className="artist-notice" role="status">
                        <LoaderCircle size={16} aria-hidden />{" "}
                        {v.ARTIST_METADATA_LOADING}
                    </p>
                )}
                {searchFailed && (
                    <p className="artist-notice" role="alert">
                        {v.ARTIST_METADATA_ERROR}{" "}
                        <button
                            className="artist-text-action"
                            onClick={retrySearch}
                        >
                            {v.ARTIST_METADATA_RETRY}
                        </button>
                    </p>
                )}
                {!searching && !searchFailed && !candidates.length && (
                    <p className="artist-empty">{v.ARTIST_METADATA_EMPTY}</p>
                )}
                {candidates.length > 0 &&
                    (!selected ||
                        candidates.filter(
                            (item) =>
                                normalizeArtistName(item.name) ===
                                normalizeArtistName(name)
                        ).length !== 1) && (
                        <label
                            className="artist-identity"
                            htmlFor="artist-match"
                        >
                            <span>{v.ARTIST_METADATA_IDENTITY}</span>
                            <select
                                id="artist-match"
                                value={selected}
                                onChange={(event) =>
                                    chooseArtist(event.target.value)
                                }
                            >
                                <option value="">
                                    {v.ARTIST_METADATA_CHOOSE}
                                </option>
                                {candidates.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                        {item.note ? ` — ${item.note}` : ""}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                {profileLoading && (
                    <p className="artist-notice" role="status">
                        {v.ARTIST_METADATA_LOADING}
                    </p>
                )}
                {profileFailed && (
                    <p className="artist-notice" role="alert">
                        {v.ARTIST_METADATA_ERROR}{" "}
                        <button
                            className="artist-text-action"
                            onClick={retrySearch}
                        >
                            {v.ARTIST_METADATA_RETRY}
                        </button>
                    </p>
                )}
                {profile?.stale && (
                    <p className="artist-notice" role="status">
                        {v.ARTIST_METADATA_STALE}
                    </p>
                )}
            </div>
            {children}
            <section
                className="artist-discography"
                aria-labelledby="artist-discography-title"
            >
                <h2 id="artist-discography-title">{v.ARTIST_DISCOGRAPHY}</h2>
                {localAlbums}
                {selected && (
                    <MetadataCatalog
                        key={`${selected}-albums-${attempt}`}
                        id={selected}
                        name={name}
                        entity="artist-discography"
                        songs={songs}
                        albums={albums}
                    />
                )}
            </section>
            {selected && (
                <details
                    className="artist-recordings-disclosure"
                    onToggle={(event) =>
                        setShowRecordings(event.currentTarget.open)
                    }
                >
                    <summary>{v.ARTIST_METADATA_RECORDINGS}</summary>
                    {showRecordings && (
                        <MetadataCatalog
                            key={`${selected}-recordings-${attempt}`}
                            id={selected}
                            name={name}
                            entity="artist-recordings"
                            songs={songs}
                            albums={albums}
                        />
                    )}
                </details>
            )}
            {profile && (
                <div className="artist-secondary">
                    {!!profile.related.length && (
                        <section className="artist-metadata-related">
                            <h3>{v.ARTIST_RELATED}</h3>
                            <div className="artist-related-names">
                                {profile.related.map((item, index) => (
                                    <Link
                                        key={`${item.id}-${index}`}
                                        href={artistSearchUrl(item.name)}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                    <section className="artist-events">
                        <h3>{v.ARTIST_METADATA_EVENTS}</h3>
                        {upcoming.slice(0, 3).map((event) => (
                            <div key={event.id} className="artist-event-row">
                                <time>{event.date}</time>
                                <span>{event.title}</span>
                            </div>
                        ))}
                        {!upcoming.length && (
                            <p className="artist-empty">
                                {v.ARTIST_NO_UPCOMING_EVENTS}
                            </p>
                        )}
                        {upcoming.length > 3 && (
                            <details>
                                <summary>{v.ARTIST_MORE}</summary>
                                {upcoming.slice(3).map((event) => (
                                    <div
                                        key={event.id}
                                        className="artist-event-row"
                                    >
                                        <time>{event.date}</time>
                                        <span>{event.title}</span>
                                    </div>
                                ))}
                            </details>
                        )}
                        {!!past.length && (
                            <details className="artist-event-history">
                                <summary>
                                    {v.ARTIST_EVENT_HISTORY} · {past.length}
                                </summary>
                                <div className="artist-event-scroll">
                                    {past.map((event) => (
                                        <div
                                            key={event.id}
                                            className="artist-event-row"
                                        >
                                            <time>{event.date}</time>
                                            <span>{event.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}

function MetadataCatalog({
    id,
    entity,
    name,
    songs,
    albums: localAlbums,
}: {
    name: string;
    songs: ArtistPageResponse["songs"];
    albums: ArtistPageResponse["albums"];
    id: string;
    entity: "artist-discography" | "artist-recordings";
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [catalog, setCatalog] = useState<
        ArtistMetadataCatalog & { stale: boolean; hasMore: boolean }
    >();
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const albums = entity === "artist-discography";
    useEffect(() => {
        let active = true;
        void getArtistMetadataCatalog(id, entity, offset)
            .then((next) => {
                if (!active) return;
                setCatalog((current) => ({
                    ...next,
                    hasMore:
                        next.items.length > 0 &&
                        next.offset + next.items.length < next.total,
                    items:
                        offset === 0
                            ? next.items
                            : [...(current?.items ?? []), ...next.items],
                }));
            })
            .catch(() => {
                if (active) setFailed(true);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [id, entity, offset, attempt]);
    const items = [...(catalog?.items ?? [])];
    if (albums)
        items.sort(
            (a, b) =>
                b.date.localeCompare(a.date) || a.title.localeCompare(b.title)
        );
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? items : items.slice(0, albums ? 8 : 5);
    return (
        <section className="artist-metadata-catalog">
            {catalog && (
                <p className="artist-catalog-count">
                    {catalog.total}{" "}
                    {albums ? v.ARTIST_RELEASES : v.ARTIST_SONGS}
                </p>
            )}
            {catalog?.stale && (
                <p className="artist-notice" role="status">
                    {v.ARTIST_METADATA_STALE}
                </p>
            )}
            <div className="artist-release-list">
                {visible.map((item) => {
                    const match = matchArtistCatalogItem(
                        item,
                        albums ? localAlbums : songs
                    );
                    const song = match?.type === "song" ? match : undefined;
                    const content = (
                        <>
                            <span>
                                <strong>{item.title}</strong>
                                {item.date && (
                                    <small>{item.date.slice(0, 4)}</small>
                                )}
                            </span>
                            {song ? (
                                song.downloaded ? (
                                    <Play size={16} aria-hidden />
                                ) : (
                                    <Download size={16} aria-hidden />
                                )
                            ) : match?.type === "album" ? (
                                <ChevronRight size={16} aria-hidden />
                            ) : (
                                <Download size={16} aria-hidden />
                            )}
                        </>
                    );
                    return song ? (
                        <button
                            key={item.id}
                            className="artist-metadata-row"
                            aria-label={`${song.downloaded ? v.ARTIST_PLAY : v.ARTIST_DOWNLOAD}: ${item.title}`}
                            onClick={() =>
                                song.downloaded
                                    ? playArtistSongs(songs, song.publicId)
                                    : void rockIt.downloaderManager.downloadMediaAsync(
                                          [song.publicId],
                                          song.name
                                      )
                            }
                        >
                            {content}
                        </button>
                    ) : match?.type !== "album" ? (
                        <CatalogSources
                            key={item.id}
                            name={name}
                            title={item.title}
                            type={albums ? "album" : "song"}
                        >
                            {content}
                        </CatalogSources>
                    ) : (
                        <Link
                            key={item.id}
                            className="artist-metadata-row"
                            href={`/album/${match.publicId}`}
                            aria-label={`${v.ARTIST_OPEN_ALBUM}: ${item.title}`}
                        >
                            {content}
                        </Link>
                    );
                })}
            </div>
            {loading && (
                <p className="artist-notice" role="status">
                    {v.ARTIST_METADATA_LOADING}
                </p>
            )}
            {failed && (
                <p className="artist-notice" role="alert">
                    {v.ARTIST_METADATA_ERROR}{" "}
                    <button
                        className="artist-text-action"
                        onClick={() => {
                            setLoading(true);
                            setFailed(false);
                            setAttempt(attempt + 1);
                        }}
                    >
                        {v.ARTIST_METADATA_RETRY}
                    </button>
                </p>
            )}
            {!loading && !failed && !items.length && (
                <p className="artist-empty">{v.ARTIST_METADATA_EMPTY}</p>
            )}
            {!expanded && items.length > visible.length && (
                <button
                    className="artist-text-action"
                    onClick={() => setExpanded(true)}
                >
                    {v.ARTIST_MORE}
                </button>
            )}
            {expanded && items.length > (albums ? 8 : 5) && (
                <button
                    className="artist-text-action"
                    onClick={() => setExpanded(false)}
                >
                    {v.ARTIST_LESS}
                </button>
            )}
            {expanded && catalog && catalog.hasMore && !failed && (
                <button
                    className="artist-more"
                    disabled={loading}
                    onClick={() => {
                        setLoading(true);
                        setFailed(false);
                        setOffset(catalog.items.length);
                    }}
                >
                    {v.ARTIST_MORE}
                </button>
            )}
        </section>
    );
}

function CatalogSources({
    name,
    title,
    type,
    children,
}: {
    name: string;
    title: string;
    type: "album" | "song";
    children: ReactNode;
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [open, setOpen] = useState(false);
    return (
        <div className="artist-release">
            <button
                className="artist-metadata-row"
                aria-expanded={open}
                aria-label={`${v.DOWNLOAD}: ${title}`}
                onClick={() => setOpen(!open)}
            >
                {children}
            </button>
            {open && <ArtistSources artist={name} title={title} type={type} />}
        </div>
    );
}
