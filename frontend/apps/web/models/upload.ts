export type UploadType = "song" | "album" | "video";

export interface SongFile {
    id: string;
    file: File;
    title: string;
    artist: string;
    track: string;
    imageFile: File | null;
    readingCover: boolean;
}

export interface EmbeddedPicture {
    file: File;
    front: boolean;
}
