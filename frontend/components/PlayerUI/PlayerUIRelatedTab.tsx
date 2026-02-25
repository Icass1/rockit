"use client";

import Image from "next/image";
import Link from "next/link";

const MOCK_COLUMNS = 5;
const MOCK_SONGS_PER_COLUMN = 3;

export function PlayerUIRelatedTab() {
    return (
        <>
            <section>
                <h2 className="text-left text-2xl font-bold">Similar Songs</h2>
                <div className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 py-2 md:[scrollbar-gutter:stable]">
                    {Array.from({ length: MOCK_COLUMNS }).map((_, colIdx) => (
                        <div
                            key={colIdx}
                            className="flex w-[calc(50%-10px)] max-w-[300px] flex-none snap-center flex-col gap-1"
                        >
                            {Array.from({ length: MOCK_SONGS_PER_COLUMN }).map(
                                (_, songIdx) => {
                                    const n =
                                        colIdx * MOCK_SONGS_PER_COLUMN +
                                        songIdx +
                                        1;
                                    return (
                                        <Link
                                            href="#"
                                            key={songIdx}
                                            className="flex h-fit items-center gap-2 rounded-lg p-2 transition hover:bg-zinc-800"
                                        >
                                            <Image
                                                className="h-12 w-12 rounded-sm object-cover"
                                                src="/song-placeholder.png"
                                                alt={`Song ${n}`}
                                                width={48}
                                                height={48}
                                            />
                                            <div className="flex min-w-0 flex-col justify-center">
                                                <span className="text-md truncate font-semibold text-white">
                                                    Song {n}
                                                </span>
                                                <span className="truncate text-sm text-gray-400">
                                                    Artist {n} • Album {n}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                }
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="pt-7 text-left text-2xl font-bold">
                    Artists you may like
                </h2>
                <div className="scrollbar-hide flex snap-x snap-mandatory gap-7 overflow-x-auto px-2 py-4">
                    {Array.from({ length: MOCK_COLUMNS }).map((_, idx) => (
                        <div
                            key={idx}
                            className="flex flex-none snap-center flex-col items-center gap-2"
                        >
                            <Image
                                className="h-28 w-28 rounded-full object-cover"
                                src="/user-placeholder.png"
                                alt={`Artist ${idx + 1}`}
                                width={112}
                                height={112}
                            />
                            <span className="text-md truncate text-center font-semibold text-white">
                                Artist {idx + 1}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="pt-7 text-left text-2xl font-bold">
                    Song / Artist Description
                </h2>
                <Link href="" className="line-clamp-4 px-5 pt-2 text-justify">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                    ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </Link>
            </section>
        </>
    );
}
