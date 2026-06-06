import type { BasePlaylistWithoutMediasResponse, Vocabulary } from "@rockit/shared";
import type { TMediaWithSearch } from "@/models/types/media";

export type ActionComponentProps = {
    media: TMediaWithSearch;
    vocabulary: Vocabulary;
    playlists: BasePlaylistWithoutMediasResponse[];
    loading: boolean;
    setLoading: (loading: boolean) => void;
    listPublicId?: string;
    handleAddToPlaylist: (
        playlist: BasePlaylistWithoutMediasResponse
    ) => Promise<void>;
};
