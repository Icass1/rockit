"use client";

export default function LyricsSection({
    songPublicId,
}: {
    songPublicId: string;
}) {
    return (
        <section className="relative mx-auto w-full rounded-lg bg-[#3030306f] px-4 py-4 md:px-8">
            Missing request for lyrics of {songPublicId}
        </section>
    );

    // const [expanded, setExpanded] = useState(false);
    // const maxLines = 7; // Número de líneas visibles inicialmente.

    // const toggleExpand = () => {
    //     setExpanded(!expanded);
    // };

    // return (
    //     <div className="mx-auto h-fit rounded-lg bg-[#3030306f] px-6 py-8 md:px-8">
    //         <h2 className="mb-4 text-center text-2xl font-bold">Lyrics</h2>
    //         <div>
    //             <div className="text-justify text-white transition-all">
    //                 {song.lyrics ? (
    //                     <>
    //                         {song.lyrics
    //                             .split("\n")
    //                             .slice(0, expanded ? undefined : maxLines)
    //                             .map((line, index) => (
    //                                 <p key={index} className="text-center">
    //                                     {line}
    //                                 </p>
    //                             ))}
    //                         {song.lyrics.split("\n").length > maxLines && (
    //                             <button
    //                                 onClick={toggleExpand}
    //                                 className="mx-auto mt-4 block text-blue-500 hover:underline"
    //                             >
    //                                 {expanded ? "Show Less" : "Show More"}
    //                             </button>
    //                         )}
    //                     </>
    //                 ) : (
    //                     <p className="text-center">Lyrics not available</p>
    //                 )}
    //             </div>
    //         </div>
    //     </div>
    // );
}
