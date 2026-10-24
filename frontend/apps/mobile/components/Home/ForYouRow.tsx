import { useEffect, useState } from "react";
import type { BaseSongWithAlbumResponse } from "@rockit/shared";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/lib/vocabulary";
import HorizontalSongRow from "@/components/Home/HorizontalSongRow";

const FOR_YOU_LIMIT = 20;

/**
 * Personalized picks from /recommendation/for-you. Fetches its own data so
 * changing the backend algorithm never touches this file; renders nothing
 * while empty.
 */
export default function ForYouRow({
    onSongPress,
}: {
    onSongPress?: (
        song: BaseSongWithAlbumResponse,
        allSongs: BaseSongWithAlbumResponse[]
    ) => void;
}) {
    const { vocabulary } = useVocabulary();
    const [songs, setSongs] = useState<BaseSongWithAlbumResponse[]>([]);

    useEffect(() => {
        let cancelled = false;
        Http.getRecommendationsForYou(FOR_YOU_LIMIT).then((response) => {
            if (cancelled) return;
            setSongs(response.isOk() ? response.result.songs : []);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    if (songs.length === 0) return null;

    return (
        <HorizontalSongRow
            title={vocabulary.FOR_YOU}
            songs={songs}
            listKey="for-you"
            onSongPress={onSongPress}
        />
    );
}
