import { BACKEND_URL } from "@rockit/shared";
import {
    AudioBoundsResponseSchema,
    type AudioBoundsResponse,
} from "@rockit/shared/dto/audioBoundsResponse";

/** Optional metadata; timeout/offline errors are handled by the playback caller. */
export async function fetchAudioBounds(
    publicId: string
): Promise<AudioBoundsResponse | undefined> {
    const response = await fetch(
        `${BACKEND_URL}/media/song/${encodeURIComponent(publicId)}/audio-bounds`,
        {
            credentials: "include",
            cache: "no-store",
            signal: AbortSignal.timeout(4000),
        }
    );
    if (!response.ok) return undefined;
    const parsed = AudioBoundsResponseSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : undefined;
}
