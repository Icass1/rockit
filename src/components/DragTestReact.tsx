import { EllipsisVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Song = { name: string; id: string };

export default function DragTestReact() {
    const [songs, setSongs] = useState(
        Array(20)
            .fill(1)
            .map((_, index) => {
                return { name: `Song ${index}`, id: index.toString() };
            })
    );

    const [draggingSong, setDraggingSong] = useState<Song | undefined>();
    const [draggingPos, setDraggingPos] = useState<[number, number]>([0, 0]);
    const divRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseUp = (event: globalThis.MouseEvent) => {
            if (!divRef.current || !draggingSong) return;
            let spacerIndex = undefined;
            if (divRef.current.offsetTop) {
                spacerIndex = Math.floor(
                    (event.clientY -
                        10 -
                        divRef.current.offsetTop +
                        divRef.current.scrollTop) /
                        40
                );
            }

            setSongs((prevSongs) => {
                let tempDraggingSong = prevSongs.find(
                    (song) => song.id == draggingSong.id
                );
                if (typeof tempDraggingSong == "undefined") return prevSongs;
                if (typeof spacerIndex == "undefined") return prevSongs;

                let dragginSongIndex = prevSongs.indexOf(tempDraggingSong);

                if (spacerIndex > dragginSongIndex) {
                    return [
                        ...prevSongs.slice(0, dragginSongIndex),
                        ...prevSongs.slice(
                            dragginSongIndex + 1,
                            spacerIndex + 2
                        ),
                        tempDraggingSong,
                        ...prevSongs.slice(spacerIndex + 2),
                    ];
                } else if (spacerIndex < dragginSongIndex) {
                    return [
                        ...prevSongs.slice(0, spacerIndex + 1),
                        tempDraggingSong,
                        ...prevSongs.slice(spacerIndex + 1, dragginSongIndex),
                        ...prevSongs.slice(dragginSongIndex + 1),
                    ];
                }
                return prevSongs;
            });
            setDraggingSong(undefined);
        };
        const handleMouseMove = (event: globalThis.MouseEvent) => {
            if (!divRef.current) return;
            setDraggingPos([event.clientX - 10, event.clientY - 10]);
        };

        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("mousemove", handleMouseMove);

        return () => {
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, [divRef, draggingSong]);

    return (
        <div
            ref={divRef}
            className="w-[300px] h-[600px] mx-auto mt-10 bg-slate-800 block overflow-y-scroll select-none"
        >
            {songs
                .filter((song) => song.id != draggingSong?.id)
                .map((song, index) => {
                    let spacerIndex = undefined;
                    if (divRef.current?.offsetTop) {
                        spacerIndex = Math.floor(
                            (draggingPos[1] -
                                divRef.current?.offsetTop +
                                divRef.current.scrollTop) /
                                40
                        );
                    }
                    return (
                        <div key={song.id} id={song.id}>
                            {draggingSong &&
                                spacerIndex == -1 &&
                                index == 0 && (
                                    <div className="h-1 bg-red-400"></div>
                                )}
                            <div className="h-10 hover:bg-slate-700 p-2 flex flex-row items-center">
                                <EllipsisVertical
                                    className="text-white w-5 h-12 md:hover:cursor-move"
                                    onMouseDown={() => {
                                        setDraggingSong(song);
                                    }}
                                />
                                <label>{song.name}</label>
                            </div>
                            {draggingSong &&
                                typeof spacerIndex != "undefined" &&
                                spacerIndex == index && (
                                    <div className="h-1 bg-red-400"></div>
                                )}
                        </div>
                    );
                })}

            {draggingSong && divRef.current && (
                <div
                    className="h-10 hover:bg-slate-700 p-2 flex flex-row items-center fixed"
                    style={{
                        top: `${draggingPos[1]}px`,
                        left: `${draggingPos[0]}px`,
                    }}
                >
                    <EllipsisVertical className="text-white w-5 h-12 md:hover:cursor-move" />
                    <label>{draggingSong.name}</label>
                </div>
            )}
        </div>
    );
}
