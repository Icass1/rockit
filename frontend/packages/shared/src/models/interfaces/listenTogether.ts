export interface ListenSession {
    publicId: string;
    hostPublicId: string;
    hostUsername: string;
    hostImageUrl: string | null;
    guestPublicId: string;
    guestUsername: string;
    guestImageUrl: string | null;
    currentMediaPublicId: string | null;
    currentMediaName: string | null;
    currentMediaImageUrl: string | null;
    currentTimeMs: number;
    isPlaying: boolean;
    status: string;
}
