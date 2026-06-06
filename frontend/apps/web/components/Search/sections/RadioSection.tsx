"use client";

import { JSX } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import type { BaseSearchResultsItem } from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";

export default function RadioSection({
    stations,
}: {
    stations: BaseSearchResultsItem[];
}): JSX.Element | null {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    if (stations.length === 0) return null;

    const handlePlay = async (station: BaseSearchResultsItem): Promise<void> => {
        const publicId = station.url?.split("/").pop();
        if (publicId) {
            await rockIt.stationManager.playStationByPublicId(publicId);
        }
    };

    return (
        <section className="py-2 text-white md:py-6 md:pl-12">
            <h2 className="px-5 text-left text-2xl font-bold md:px-0 md:text-3xl">
                {$vocabulary.RADIO_STATIONS}
            </h2>
            <div className="relative flex items-center gap-4 overflow-x-auto px-8 py-4 md:pr-14 md:pl-4">
                {stations.map(
                    (station): JSX.Element => (
                        <div
                            className="w-36 flex-none cursor-pointer transition md:w-48 md:hover:scale-105"
                            key={station.providerUrl + station.name}
                            onClick={(): Promise<void> => handlePlay(station)}
                        >
                            <Image
                                width={350}
                                height={350}
                                className="aspect-square w-full rounded-lg object-cover"
                                src={
                                    station.imageUrl
                                        ? station.imageUrl
                                        : "/radio-placeholder.png"
                                }
                                alt={`Radio station ${station.name}`}
                            />
                            <span className="mt-2 block truncate text-center font-semibold">
                                {station.name}
                            </span>
                        </div>
                    )
                )}
            </div>
        </section>
    );
}
