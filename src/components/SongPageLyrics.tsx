import { useState } from "react";

interface LyricsSectionProps {
    song: {
        lyrics?: string; // Las letras son opcionales.
    };
}

export default function LyricsSection({ song }: LyricsSectionProps) {
    const [expanded, setExpanded] = useState(false);
    const maxLines = 7; // Número de líneas visibles inicialmente.

    const toggleExpand = () => {
        setExpanded(!expanded);
    };

    return (
        <div className="mx-auto px-6 md:px-8 py-8 bg-[#3030306f] rounded-lg h-fit">
            <h2 className="text-2xl font-bold mb-4 text-center">Lyrics</h2>
            <div>
                <div className="text-white transition-all text-justify">
                    {song.lyrics ? (
                        <>
                            {song.lyrics
                                .split("\n")
                                .slice(0, expanded ? undefined : maxLines)
                                .map((line, index) => (
                                    <p key={index} className="text-center">
                                        {line}
                                    </p>
                                ))}
                            {song.lyrics.split("\n").length > maxLines && (
                                <button
                                    onClick={toggleExpand}
                                    className="block mx-auto mt-4 text-blue-500 hover:underline"
                                >
                                    {expanded ? "Show Less" : "Show More"}
                                </button>
                            )}
                        </>
                    ) : (
                        <p className="text-center">Lyrics not available</p>
                    )}
                </div>
            </div>
        </div>
    );
}