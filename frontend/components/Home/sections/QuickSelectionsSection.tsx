import { BaseSongWithAlbumResponse } from "@/dto";
import QuickSelectionsSong from "@/components/Home/QuickSelectionsSong";

const COLUMNS = 10;
const SONGS_PER_COLUMN = 4;
const SONGS_POOL = 8 * SONGS_PER_COLUMN + SONGS_PER_COLUMN;

interface QuickSelectionsSectionProps {
    title: string;
    songs: BaseSongWithAlbumResponse[];
}

export default function QuickSelectionsSection({
    title,
    songs,
}: QuickSelectionsSectionProps) {
    if (songs.length === 0) return null;

    const songsPool = songs.slice(0, SONGS_POOL);

    return (
        <section className="text-white md:pl-12">
            <h2 className="px-5 text-2xl font-bold md:text-3xl">{title}</h2>
            <div className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto px-8 py-4 md:gap-4 md:px-2 md:[scrollbar-gutter:stable]">
                {Array.from({ length: COLUMNS }).map((_, columnIndex) => (
                    <div
                        key={columnIndex}
                        className="flex w-[51%] max-w-50 flex-none snap-center flex-col gap-1 md:w-[calc(25%-10px)] md:max-w-87.5"
                    >
                        {songs
                            .slice(
                                columnIndex * SONGS_PER_COLUMN,
                                columnIndex * SONGS_PER_COLUMN +
                                    SONGS_PER_COLUMN
                            )
                            .map((song) => (
                                <QuickSelectionsSong
                                    key={`${columnIndex}_${song.publicId}`}
                                    song={song}
                                    songs={songsPool}
                                />
                            ))}
                    </div>
                ))}
            </div>
        </section>
    );
}
