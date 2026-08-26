import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { isSearchResult, type TMedia } from "@rockit/shared";
import { Radio } from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import ContextMenuOption from "@/components/ContextMenu/Option";
import type { ActionComponentProps } from "@/components/MediaContextMenu/actions/ActionProps";

const SIMILAR_SONGS_PLAYLIST_LIMIT = 20;

/** "Similar to this Song" — builds a new playlist from Rockit's own
 * /related endpoint (co-occurrence + Last.fm discovery), Spotify Song
 * Radio style. Only uses already-downloaded matches; Last.fm suggestions
 * not yet in this library are skipped here (they need a download step). */
export default function SimilarSongsAction({
    media,
    vocabulary,
    loading,
    setLoading,
}: ActionComponentProps): JSX.Element | null {
    const router = useRouter();

    if (isSearchResult(media) || (media as TMedia).type !== "song") return null;

    const songMedia = media as TMedia & {
        type: "song";
        publicId: string;
        name: string;
    };

    const handleClick = async (): Promise<void> => {
        setLoading(true);
        try {
            const relatedRes = await Http.getRelatedSongs(
                songMedia.publicId,
                SIMILAR_SONGS_PLAYLIST_LIMIT
            );
            if (!relatedRes.isOk() || relatedRes.result.songs.length === 0) {
                rockIt.notificationManager.notifyError(
                    vocabulary.NO_SIMILAR_SONGS_FOUND
                );
                return;
            }

            const playlistRes = await Http.createPlaylistAsync({
                name: `${vocabulary.SIMILAR_TO_SONG_PLAYLIST_PREFIX} ${songMedia.name}`,
                description: null,
                isPublic: true,
            });
            if (!playlistRes.isOk()) {
                rockIt.notificationManager.notifyError(
                    vocabulary.ERROR_CREATING_PLAYLIST
                );
                return;
            }

            const playlistPublicId = playlistRes.result.publicId;
            await Promise.all(
                relatedRes.result.songs.map((song) =>
                    Http.addMediaToPlaylistAsync(playlistPublicId, {
                        mediaPublicId: song.publicId,
                    })
                )
            );

            rockIt.notificationManager.notifySuccess(
                vocabulary.SIMILAR_SONGS_PLAYLIST_CREATED
            );
            router.push(`/playlist/${playlistPublicId}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ContextMenuOption onClick={handleClick} disable={loading}>
            <Radio />
            {vocabulary.SIMILAR_TO_SONG}
        </ContextMenuOption>
    );
}
