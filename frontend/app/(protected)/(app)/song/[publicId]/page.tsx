import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EllipsisVertical } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import LikeButton from "@/components/LikeButton";
import SongPopupMenu from "@/components/ListSongs/SongPopupMenu";
import SongPageAlbum from "@/components/SongPage/SongPageAlbum";
import SongPageCover from "@/components/SongPage/SongPageCover";
import LyricsSection from "@/components/SongPage/SongPageLyrics";

const getSong = cache(async (publicId: string) => {
    return rockIt.songManager.getSongAsync(publicId);
});

export async function generateMetadata({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    const song = await getSong(publicId);

    if (!song) return {};

    return {
        title: `${song.name} by ${song.artists[0].name}`,
        description: `Listen to ${song.name} by ${song.artists[0].name}`,
        openGraph: {
            title: `${song.name} by ${song.artists[0].name}`,
            description: `Listen to ${song.name} by ${song.artists[0].name}`,
            type: "music.song",
            url: `https://${rockIt.BACKEND_URL}/song/${publicId}`,
            images: [
                {
                    url: song.album.internalImageUrl,
                    width: 600,
                    height: 600,
                    alt: song.name,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: `${song.name} by ${song.artists[0].name}`,
            description: `Listen to ${song.name} by ${song.artists[0].name}`,
            images: [
                {
                    url: song.album.internalImageUrl,
                    width: 600,
                    height: 600,
                    alt: song.name,
                },
            ],
        },
    };
}

export default async function SongPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;

    const song = await getSong(publicId);
    if (!song) notFound();

    const artist = song.artists[0];

    return (
        <div className="h-full w-full overflow-y-scroll p-2 pb-16 pt-16 md:mb-0 md:mt-0 md:pb-24 md:pt-24">
            <div className="mx-auto grid w-full grid-cols-1 items-center gap-4 px-10 md:grid-cols-3 md:p-6">
                <div className="hidden flex-col items-center justify-center md:flex">
                    <div className="flex w-full max-w-sm items-center rounded-lg bg-neutral-200 p-4 shadow-md">
                        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-full bg-neutral-300">
                            <Image
                                src={
                                    artist.internalImageUrl ??
                                    rockIt.USER_PLACEHOLDER_IMAGE_URL
                                }
                                width={128}
                                height={128}
                                alt={artist.name}
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <div className="ml-4">
                            <Link
                                href={`/artist/${artist.publicId}`}
                                className="text-2xl font-bold text-gray-800 hover:underline"
                            >
                                {artist.name}
                            </Link>
                            {song.artists.length > 1 && (
                                <p className="text-md font-semibold text-gray-600">
                                    ft.{" "}
                                    {song.artists.slice(1).map((a, i) => (
                                        <span key={a.publicId}>
                                            <Link
                                                href={`/artist/${a.publicId}`}
                                                className="hover:underline"
                                            >
                                                {a.name}
                                            </Link>
                                            {i < song.artists.length - 2 &&
                                                ", "}
                                        </span>
                                    ))}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center">
                    <SongPageCover song={song} />
                    <h1 className="mt-4 line-clamp-3 text-center text-3xl font-bold">
                        {song.name}
                    </h1>

                    <div className="flex flex-col items-center md:hidden">
                        <Link
                            href={`/album/${song.album.publicId}`}
                            className="py-2 text-center text-2xl font-semibold text-neutral-300 hover:underline"
                        >
                            {song.album.name}
                        </Link>
                        <p className="text-center text-lg font-semibold text-neutral-400">
                            {song.artists.map((a, i) => (
                                <span key={a.publicId}>
                                    <Link href={`/artist/${a.publicId}`}>
                                        {a.name}
                                    </Link>
                                    {i < song.artists.length - 1 && ", "}
                                </span>
                            ))}
                        </p>
                    </div>

                    <div className="mt-4 flex flex-row justify-center gap-4">
                        <div className="flex select-none flex-row items-center gap-2 rounded bg-[#3030306f] p-2 hover:bg-[#313131]">
                            <LikeButton songPublicId={song.publicId} />
                            <span>Like</span>
                        </div>
                        <SongPopupMenu song={song}>
                            <div className="flex cursor-pointer items-center rounded bg-[#3030306f] p-2 hover:bg-[#313131]">
                                <EllipsisVertical className="h-5 w-5" />
                                <span>More Options</span>
                            </div>
                        </SongPopupMenu>
                    </div>
                </div>

                <div className="hidden flex-col items-center justify-center md:flex">
                    <div className="flex w-full max-w-sm items-center rounded-lg bg-neutral-200 p-4 shadow-md">
                        <div className="ml-4">
                            <Link
                                href={`/album/${song.album.publicId}`}
                                className="text-2xl font-bold text-gray-800 hover:underline"
                            >
                                {song.album.name}
                            </Link>
                            <p className="text-md font-semibold text-gray-600">
                                Album released on{" "}
                                {song.album.releaseDate
                                    .split("-")
                                    .reverse()
                                    .join("/")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-8 px-4">
                <LyricsSection songPublicId={song.publicId} />
                <SongPageAlbum albumPublicId={song.album.publicId} />
                {/* <SongPageTopArtistSongs artist={artist} /> */}
            </div>
        </div>
    );
}
