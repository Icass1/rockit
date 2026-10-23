"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import type { ArtistMetadataCatalog, ArtistMetadataIdentity } from "@/dto";
import { useStore } from "@nanostores/react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    findArtistMetadata,
    getArtistMetadataCatalog,
    getArtistMetadataProfile,
} from "@/lib/services/artistMetadataService";

type Profile = Awaited<ReturnType<typeof getArtistMetadataProfile>>;
type Catalog = ArtistMetadataCatalog & { stale: boolean; hasMore: boolean };
const normalize = (name: string): string =>
    name.normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase();

export default function ArtistMetadataClient({
    name,
}: {
    name: string;
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [candidates, setCandidates] = useState<ArtistMetadataIdentity[]>([]);
    const [selected, setSelected] = useState("");
    const [searching, setSearching] = useState(true);
    const [searchFailed, setSearchFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [profile, setProfile] = useState<Profile>();
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
                    (item) => normalize(item.name) === normalize(name)
                );
                if (exact.length === 1) chooseArtist(exact[0].id);
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

    return (
        <section
            className="artist-explore"
            aria-labelledby="artist-explore-title"
        >
            <div className="artist-section-heading">
                <h2 id="artist-explore-title">{v.ARTIST_EXPLORE}</h2>
                <a
                    className="artist-source"
                    href="https://musicbrainz.org"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    MusicBrainz <ArrowUpRight size={16} aria-hidden />
                </a>
            </div>
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
            {candidates.length > 0 && (
                <label className="artist-identity">
                    <span>{v.ARTIST_METADATA_IDENTITY}</span>
                    <select
                        value={selected}
                        onChange={(event) => chooseArtist(event.target.value)}
                    >
                        <option value="">{v.ARTIST_METADATA_CHOOSE}</option>
                        {candidates.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                                {item.note ? ` — ${item.note}` : ""}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            {selected && (
                <>
                    {profileLoading && (
                        <p className="artist-notice" role="status">
                            {v.ARTIST_METADATA_LOADING}
                        </p>
                    )}
                    {profileFailed && (
                        <p className="artist-notice" role="alert">
                            {v.ARTIST_METADATA_ERROR}
                        </p>
                    )}
                    {profile && (
                        <>
                            {profile.stale && (
                                <p className="artist-notice" role="status">
                                    {v.ARTIST_METADATA_STALE}
                                </p>
                            )}
                            <p className="artist-context">
                                {profile.description}
                            </p>
                            {!!profile.genres.length && (
                                <p className="artist-genres">
                                    {profile.genres.join(" · ")}
                                </p>
                            )}
                        </>
                    )}
                    <MetadataCatalog
                        key={`${selected}-albums-${attempt}`}
                        id={selected}
                        entity="artist-discography"
                    />
                    <MetadataCatalog
                        key={`${selected}-recordings-${attempt}`}
                        id={selected}
                        entity="artist-recordings"
                    />
                    {profile && (
                        <>
                            {!!profile.related.length && (
                                <section className="artist-metadata-related">
                                    <h3>{v.ARTIST_RELATED}</h3>
                                    {profile.related.map((item, index) => (
                                        <a
                                            key={`${item.id}-${index}`}
                                            className="artist-metadata-row"
                                            href={`https://musicbrainz.org/artist/${item.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <span>
                                                {item.name}
                                                <small>{item.note}</small>
                                            </span>
                                            <ArrowUpRight
                                                size={16}
                                                aria-hidden
                                            />
                                        </a>
                                    ))}
                                </section>
                            )}
                            <section className="artist-events">
                                <h3>{v.ARTIST_METADATA_EVENTS}</h3>
                                {profile.events.map((event, index) => (
                                    <a
                                        key={`${event.id}-${index}`}
                                        className="artist-metadata-row"
                                        href={`https://musicbrainz.org/event/${event.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <span>{event.title}</span>
                                        <time>{event.date}</time>
                                        <ArrowUpRight size={16} aria-hidden />
                                    </a>
                                ))}
                                {!profile.events.length && (
                                    <p className="artist-empty">
                                        {v.ARTIST_METADATA_NO_EVENTS}
                                    </p>
                                )}
                            </section>
                        </>
                    )}
                    <p className="artist-footnote">{v.ARTIST_METADATA_NOTE}</p>
                    <button
                        className="artist-text-action"
                        onClick={retrySearch}
                    >
                        {v.ARTIST_METADATA_RETRY}
                    </button>
                </>
            )}
        </section>
    );
}

function MetadataCatalog({
    id,
    entity,
}: {
    id: string;
    entity: "artist-discography" | "artist-recordings";
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [catalog, setCatalog] = useState<Catalog>();
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
            <h3>
                {albums
                    ? v.ARTIST_METADATA_ALBUMS
                    : v.ARTIST_METADATA_RECORDINGS}{" "}
                {catalog && (
                    <span className="artist-catalog-count">
                        {catalog.items.length} / {catalog.total}
                    </span>
                )}
            </h3>
            {catalog?.stale && (
                <p className="artist-notice" role="status">
                    {v.ARTIST_METADATA_STALE}
                </p>
            )}
            <div className={albums ? "artist-release-list" : ""}>
                {visible.map((item) => (
                    <a
                        key={item.id}
                        className="artist-metadata-row"
                        href={`https://musicbrainz.org/${albums ? "release-group" : "recording"}/${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span>
                            {item.title}
                            <small>{item.kind}</small>
                        </span>
                        {item.date && <time>{item.date}</time>}
                        <ArrowUpRight size={16} aria-hidden />
                    </a>
                ))}
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
