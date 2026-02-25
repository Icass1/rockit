import { RockItSongWithoutAlbum } from "@/lib/rockit/rockItSongWithoutAlbum";
import RecentlyPlayedSong from "@/components/Home/RecentlyPlayedSong";

interface SongScrollSectionProps {
    title: string;
    songs: RockItSongWithoutAlbum[];
    className?: string;
}

export default function SongScrollSection({
    title,
    songs,
    className = "",
}: SongScrollSectionProps) {
    if (songs.length === 0) return null;

    return (
        <section className={`text-white md:py-12 md:pl-12 ${className}`}>
            <h2 className="px-5 text-2xl font-bold md:text-3xl">{title}</h2>
            <div className="flex gap-4 overflow-x-auto px-10 py-4">
                {songs.map((song) => (
                    <RecentlyPlayedSong
                        key={song.publicId}
                        song={song}
                        songs={songs}
                    />
                ))}
            </div>
        </section>
    );
}
