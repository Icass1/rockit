import { redirect } from "next/navigation";
import { ENV } from "@/rockitEnv";
import type { SpotifyArtist, SpotifyArtistTopTracks } from "@/types/spotify";
import { Play } from "lucide-react";

interface PageProps {
  params: { id: string };
}

export default async function ArtistPage({ params }: PageProps) {
  const { id } = params;
  // 1) Fetch artist data
  const artistRes = await fetch(`${ENV.BACKEND_URL}/artist/${id}`, { cache: "no-store" });
  if (!artistRes.ok) {
    return redirect("/404");
  }
  const artistData = (await artistRes.json()) as SpotifyArtist;

  // 2) Sort images de mayor a menor
  artistData.images.sort((a, b) =>
    b.width + b.height - (a.width + a.height)
  );
  const artistImage = artistData.images[0]?.url ?? "";

  // 3) Fetch top songs
  const topRes = await fetch(
    `${ENV.BACKEND_URL}/artist-top-songs/${id}`,
    { signal: AbortSignal.timeout(2000), cache: "no-store" }
  );
  let artistSongs: SpotifyArtistTopTracks | undefined;
  if (topRes.ok) {
    artistSongs = (await topRes.json()) as SpotifyArtistTopTracks;
  }

  return (
      <div className="h-full w-full overflow-y-scroll flex flex-col bg-[#0b0b0b] text-white">
        {/* Fondo fijo con la imagen del artista */}
        <div
          className="relative w-full bg-no-repeat bg-top bg-[size:120%] md:bg-[size:100%]"
          style={{
            backgroundImage: `url('${artistImage}')`,
            backgroundAttachment: "fixed",
          }}
        >
          <div className="relative z-10 flex flex-col h-screen">
            {/* Header con nombre */}
            <div className="h-1/4 md:h-1/2 min-h-1/2 w-full p-4 md:p-8 bg-gradient-to-b from-transparent to-black/50 flex items-end">
              <h1 className="text-4xl md:text-8xl font-extrabold">
                {artistData.name}
              </h1>
            </div>

            {/* Info del artista */}
            <div className="bg-gradient-to-b from-[rgba(0,0,0,0.7)] to-[#171717] backdrop-blur-[20px] p-4 md:p-8">
              <h2 className="text-xl md:text-2xl font-semibold mb-2">
                Información del Artista
              </h2>
              <p className="text-gray-400 mb-4 md:mb-6 text-sm md:text-base line-clamp-2">
                Placeholder para la descripción del artista o estadísticas.
              </p>
            </div>

            {/* Sección Top Songs & Albums */}
            <section className="bg-[#171717] h-full px-5 md:px-52 py-4 md:py-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-52">
                {/* Top Songs */}
                <div>
                  <h2 className="text-white text-xl md:text-2xl font-bold mb-4">
                    Top Songs
                  </h2>
                  <div className="space-y-1">
                    {artistSongs?.tracks.map((song, index) => (
                      <div
                        key={song.id}
                        className="group flex items-center space-x-4 rounded-md md:hover:bg-[#212121] p-2 transition"
                      >
                        <div className="text-gray-400 text-sm md:text-lg font-semibold w-6 text-center">
                          {index + 1}
                        </div>
                        <div className="relative w-10 h-10 md:w-12 md:h-12">
                          <img
                            src={song.album.images[0]?.url ?? "/song-placeholder.png"}
                            alt={song.name}
                            className="w-full h-full rounded object-cover transition duration-300 group-hover:brightness-50"
                          />
                          <Play className="absolute inset-0 m-auto w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm md:text-base font-semibold truncate">
                            {song.name}
                          </p>
                        </div>
                        <p className="text-gray-300 text-sm md:text-base pr-2">
                          {/* Aquí podrías formatear la duración real */}
                          3:45
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Albums (mock) */}
                <div>
                  <h2 className="text-white text-xl md:text-2xl font-bold mb-4">
                    Top Albums
                  </h2>
                  <div className="space-y-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center space-x-4 rounded-md md:hover:bg-[#212121] p-2 transition"
                      >
                        <div className="text-gray-400 text-sm md:text-lg font-semibold w-6 text-center">
                          {idx + 1}
                        </div>
                        <div className="relative w-10 h-10 md:w-12 md:h-12">
                          <img
                            src="/song-placeholder.png"
                            alt={`Album ${idx + 1}`}
                            className="w-full h-full rounded object-cover transition duration-300 group-hover:brightness-50"
                          />
                          <Play className="absolute inset-0 m-auto w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm md:text-base font-semibold truncate">
                            Album {idx + 1} • 2024
                          </p>
                        </div>
                        <p className="text-gray-300 text-sm md:text-base pr-2">
                          37 Minutes
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Albums & Singles */}
            <section className="md:px-32 md:pt-12 py-3 text-white bg-[#171717]">
              <h2 className="text-2xl font-bold px-5 md:px-0">
                Albums & Singles
              </h2>
              <div className="relative flex items-center gap-5 overflow-x-auto py-4 px-8 md:px-2 md:[scrollbar-gutter:stable]">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <a
                    key={idx}
                    href="#"
                    className="flex-none w-36 md:w-48 hover:scale-105 transition"
                  >
                    <img
                      className="rounded-lg w-full aspect-square object-cover"
                      src="/song-placeholder.png"
                      alt={`Release ${idx + 1}`}
                    />
                    <label className="truncate font-semibold text-center block mt-2">
                      Release {idx + 1}
                    </label>
                    <label className="truncate text-sm text-center text-gray-400 block">
                      Artist Name
                    </label>
                  </a>
                ))}
              </div>
            </section>

            {/* Related Artists */}
            <section className="md:px-32 pt-3 pb-10 text-white bg-[#171717]">
              <h2 className="text-2xl font-bold px-5">Related Artists</h2>
              <div className="relative flex items-center gap-5 overflow-x-auto py-4 px-8 md:px-2 md:[scrollbar-gutter:stable]">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <a
                    key={idx}
                    href="#"
                    className="flex-none w-36 md:w-48 hover:scale-105 transition"
                  >
                    <img
                      className="rounded-full w-full aspect-square object-cover"
                      src="/user-placeholder.png"
                      alt={`Artist ${idx + 1}`}
                    />
                    <label className="truncate font-semibold text-center block mt-2">
                      Artist {idx + 1}
                    </label>
                  </a>
                ))}
              </div>
            </section>

            <div className="min-h-8 md:min-h-24 bg-[#171717]" />
          </div>
        </div>
      </div>
  );
}
