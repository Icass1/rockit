"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { BaseSongWithAlbumResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import useMedia from "@/hooks/useMedia";
import { isSongWithAlbum } from "@/models/types/media";

export default function RecentlyPlayedSong({
  song, songs,
}: {
  song: BaseSongWithAlbumResponse;
  songs: BaseSongWithAlbumResponse[];
}) {
  const $song = useMedia(song);
  const router = useRouter();

  const handleClick = () => {
    // Set the queue with all songs
    const playableSongs = songs.filter(isSongWithAlbum);
    if (playableSongs.length > 0) {
      rockIt.queueManager.setMedia(playableSongs, "auto-list", "");
      rockIt.queueManager.moveToMedia($song.publicId);
      rockIt.mediaPlayerManager.play();
    }
  };

  const handleArtistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (song.artists.length > 0) {
      router.push(`/artist/${song.artists[0].publicId}`);
    }
  };

  return (
    <div
      className="w-40 flex-none cursor-pointer transition md:w-48 md:hover:scale-105"
      onClick={handleClick}
    >
      <Image
        width={400} height={400}
        className="aspect-square w-full rounded-lg object-cover"
        src={$song.imageUrl}
        alt={`Cover of {$song.name}`}
      />
      <span className="mt-2 block truncate text-center font-semibold hover:underline">
        {$song.name}
      </span>
      <span
        className="block truncate text-center text-sm text-gray-400 hover:underline"
        onClick={handleArtistClick}
      >
        {$song.artists[0].name}
      </span>
    </div>
  );
}