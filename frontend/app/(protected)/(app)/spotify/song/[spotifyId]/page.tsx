import { redirect } from "next/navigation";
import { BaseSongWithoutAlbumResponseSchema } from "@/dto";
import { AppError } from "@/lib/errors/AppError";
import apiFetch from "@/lib/utils/apiFetch";

export default async function SpotifySongPage({
    params,
}: {
    params: Promise<{ spotifyId: string }>;
}) {
    const { spotifyId } = await params;
    const song = await apiFetch(`/spotify/track/${spotifyId}`);

    console.log(song, song?.status);

    if (!song) throw new AppError(505);

    if (song.status != 200) throw new AppError(505);

    const parsedSong = BaseSongWithoutAlbumResponseSchema.parse(
        await song.json()
    );
    return redirect(`/song/${parsedSong.publicId}`);
}
