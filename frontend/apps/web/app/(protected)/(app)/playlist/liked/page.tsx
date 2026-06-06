"use client";

import { JSX, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { EMediaContextLocation } from "@rockit/shared";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { BaseSongWithAlbumResponse } from "@/dto";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

export default function LikedPlaylistPage(): JSX.Element {
    const router = useRouter();
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [songs, setSongs] = useState<BaseSongWithAlbumResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const likedRes = await Http.getLikedMedia();
            if (!likedRes.isOk()) {
                setLoading(false);
                return;
            }
            const results = await Promise.all(
                likedRes.result.media.map((pubId) => Http.getSong(pubId))
            );
            setSongs(
                results.filter((r) => r.isOk()).map((r) => r.result)
            );
            setLoading(false);
        })();
    }, []);

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="mb-6 text-3xl font-bold">{$vocabulary.LIKED_SONGS}</h1>
            {songs.length === 0 ? (
                <p className="text-neutral-400">{$vocabulary.NO_SONGS}</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {songs.map((song) => (
                        <MediaContextMenu
                            key={song.publicId}
                            media={song}
                            location={EMediaContextLocation.PLAYLIST}
                            listPublicId="liked"
                        >
                            <div
                                className="flex cursor-pointer items-center gap-4 rounded-md p-2 transition hover:bg-neutral-800"
                                onClick={() => router.push(`/song/${song.publicId}`)}
                            >
                                <Image
                                    src={song.imageUrl ?? "/song-placeholder.png"}
                                    alt={song.name}
                                    width={48}
                                    height={48}
                                    className="h-12 w-12 rounded object-cover"
                                />
                                <div className="flex-1 truncate">
                                    <p className="font-semibold">{song.name}</p>
                                    <p className="text-sm text-neutral-400">
                                        {song.artists.map((a) => a.name).join(", ")}
                                    </p>
                                </div>
                            </div>
                        </MediaContextMenu>
                    ))}
                </div>
            )}
        </div>
    );
}
