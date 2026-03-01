import { redirect } from "next/navigation";
import { BaseAlbumWithSongsResponseSchema } from "@/dto";
import { AppError } from "@/lib/errors/AppError";
import apiFetch from "@/lib/utils/apiFetch";

export default async function SpotifySongPage({
    params,
}: {
    params: Promise<{ spotifyId: string }>;
}) {
    const { spotifyId } = await params;
    const album = await apiFetch(`/spotify/album/${spotifyId}`);

    if (!album) throw new AppError(505);

    if (album.status != 200) throw new AppError(505);

    const parsedAlbum = BaseAlbumWithSongsResponseSchema.parse(
        await album.json()
    );
    return redirect(`/album/${parsedAlbum.publicId}`);
}
