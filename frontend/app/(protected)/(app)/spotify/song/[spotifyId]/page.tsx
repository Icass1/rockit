import { redirect } from "next/navigation";
import { BaseSongResponseSchema } from "@/dto";
import { AppError } from "@/lib/errors/AppError";
import apiFetch from "@/lib/utils/apiFetch";

export default async function SpotifySongPage({
    params,
}: {
    params: Promise<{ spotifyId: string }>;
}) {
    const { spotifyId } = await params;

    const song = await apiFetch(`/spotify/track/${spotifyId}`);

    if (!song) {
        throw new AppError(505);
    }

    if (song.status != 200) {
        throw new AppError(505);
    }

    const parsedSong = BaseSongResponseSchema.parse(await song.json());

    console.log(parsedSong);

    return redirect(`/song/${parsedSong.publicId}`);
}
