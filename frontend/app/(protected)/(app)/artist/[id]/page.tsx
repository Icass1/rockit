import Image from "next/image";
import { notFound } from "next/navigation";
import type { SpotifyArtist, SpotifyArtistTopTracks } from "@/types/spotify";
import { Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default async function ArtistPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const artistRes = await fetch(`${rockIt.BACKEND_URL}/artist/${id}`, {
        cache: "no-store",
    });
    if (!artistRes.ok) notFound();

    const artistData = (await artistRes.json()) as SpotifyArtist;
    artistData.images.sort((a, b) => b.width + b.height - (a.width + a.height));
    const artistImage = artistData.images[0]?.url ?? "";

    // Non-fatal: page works without top songs
    let artistSongs: SpotifyArtistTopTracks | undefined;
    const topRes = await fetch(`${rockIt.BACKEND_URL}/artist-top-songs/${id}`, {
        signal: AbortSignal.timeout(2000),
        cache: "no-store",
    }).catch(() => null);
    if (topRes?.ok) {
        artistSongs = (await topRes.json()) as SpotifyArtistTopTracks;
    }

    return (
        <div className="flex h-full w-full flex-col overflow-y-scroll bg-[#0b0b0b] text-white">
            <div
                className="relative w-full bg-size-[120%] bg-top bg-no-repeat md:bg-size-[100%]"
                style={{
                    backgroundImage: `url('${artistImage}')`,
                    backgroundAttachment: "fixed",
                }}
            >
                <div className="relative z-10 flex h-screen flex-col">
                    <div className="min-h-1/2 flex h-1/4 w-full items-end bg-linear-to-b from-transparent to-black/50 p-4 md:h-1/2 md:p-8">
                        <h1 className="text-4xl font-extrabold md:text-8xl">
                            {artistData.name}
                        </h1>
                    </div>

                    <div className="bg-linear-to-b from-[rgba(0,0,0,0.7)] to-[#171717] p-4 backdrop-blur-[20px] md:p-8">
                        <h2 className="mb-2 text-xl font-semibold md:text-2xl">
                            Información del Artista
                        </h2>
                        <p className="mb-4 line-clamp-2 text-sm text-gray-400 md:mb-6 md:text-base">
                            Placeholder para la descripción del artista o
                            estadísticas.
                        </p>
                    </div>

                    <section className="h-full bg-[#171717] px-5 py-4 md:px-52 md:py-0">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-52">
                            <div>
                                <h2 className="mb-4 text-xl font-bold md:text-2xl">
                                    Top Songs
                                </h2>
                                <div className="space-y-1">
                                    {artistSongs?.tracks.map((song, index) => (
                                        <div
                                            key={song.id}
                                            className="group flex items-center space-x-4 rounded-md p-2 transition md:hover:bg-[#212121]"
                                        >
                                            <span className="w-6 text-center text-sm font-semibold text-gray-400 md:text-lg">
                                                {index + 1}
                                            </span>
                                            <div className="relative h-10 w-10 md:h-12 md:w-12">
                                                {/* Fixed: was <img>, Next.js <Image> for optimization */}
                                                <Image
                                                    src={
                                                        song.album.images[0]
                                                            ?.url ??
                                                        "/song-placeholder.png"
                                                    }
                                                    alt={song.name}
                                                    width={48}
                                                    height={48}
                                                    className="h-full w-full rounded object-cover transition duration-300 group-hover:brightness-50"
                                                />
                                                <Play className="absolute inset-0 m-auto h-5 w-5 fill-current text-white opacity-0 transition group-hover:opacity-100" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-white md:text-base">
                                                    {song.name}
                                                </p>
                                            </div>
                                            {/* TODO: format from song.duration_ms */}
                                            <p className="pr-2 text-sm text-gray-300 md:text-base">
                                                3:45
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h2 className="mb-4 text-xl font-bold md:text-2xl">
                                    Top Albums
                                </h2>
                                <div className="space-y-1">
                                    {Array.from({ length: 5 }).map((_, idx) => (
                                        <div
                                            key={idx}
                                            className="group flex items-center space-x-4 rounded-md p-2 transition md:hover:bg-[#212121]"
                                        >
                                            <span className="w-6 text-center text-sm font-semibold text-gray-400 md:text-lg">
                                                {idx + 1}
                                            </span>
                                            <div className="relative h-10 w-10 md:h-12 md:w-12">
                                                <Image
                                                    src="/song-placeholder.png"
                                                    alt={`Album ${idx + 1}`}
                                                    width={48}
                                                    height={48}
                                                    className="h-full w-full rounded object-cover transition duration-300 group-hover:brightness-50"
                                                />
                                                <Play className="absolute inset-0 m-auto h-5 w-5 fill-current text-white opacity-0 transition group-hover:opacity-100" />
                                            </div>
                                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white md:text-base">
                                                Album {idx + 1} • 2024
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-[#171717] py-3 text-white md:px-32 md:pt-12">
                        <h2 className="px-5 text-2xl font-bold md:px-0">
                            Albums & Singles
                        </h2>
                        <div className="relative flex items-center gap-5 overflow-x-auto px-8 py-4 md:px-2 md:[scrollbar-gutter:stable]">
                            {Array.from({ length: 3 }).map((_, idx) => (
                                <a
                                    key={idx}
                                    href="#"
                                    className="w-36 flex-none transition hover:scale-105 md:w-48"
                                >
                                    <Image
                                        className="aspect-square w-full rounded-lg object-cover"
                                        src="/song-placeholder.png"
                                        alt={`Release ${idx + 1}`}
                                        width={192}
                                        height={192}
                                    />
                                    <p className="mt-2 block truncate text-center font-semibold">
                                        Release {idx + 1}
                                    </p>
                                    <p className="block truncate text-center text-sm text-gray-400">
                                        Artist Name
                                    </p>
                                </a>
                            ))}
                        </div>
                    </section>

                    <section className="bg-[#171717] pb-10 pt-3 text-white md:px-32">
                        <h2 className="px-5 text-2xl font-bold">
                            Related Artists
                        </h2>
                        <div className="relative flex items-center gap-5 overflow-x-auto px-8 py-4 md:px-2 md:[scrollbar-gutter:stable]">
                            {Array.from({ length: 3 }).map((_, idx) => (
                                <a
                                    key={idx}
                                    href="#"
                                    className="w-36 flex-none transition hover:scale-105 md:w-48"
                                >
                                    <Image
                                        className="aspect-square w-full rounded-full object-cover"
                                        src="/user-placeholder.png"
                                        alt={`Artist ${idx + 1}`}
                                        width={192}
                                        height={192}
                                    />
                                    <p className="mt-2 block truncate text-center font-semibold">
                                        Artist {idx + 1}
                                    </p>
                                </a>
                            ))}
                        </div>
                    </section>

                    <div className="min-h-8 bg-[#171717] md:min-h-24" />
                </div>
            </div>
        </div>
    );
}
