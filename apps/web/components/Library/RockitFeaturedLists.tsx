"use client";

import type { JSX } from "react";
import Link from "next/link";
import { FeaturedArtwork } from "@rockit/ui";
import type { RockitListKey } from "@/models/types/navigationPins";
import { getRockitListName } from "@/lib/utils/navigationPins";
import NavigationPinMenu from "@/components/Navigation/NavigationPinMenu";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function RockitFeaturedLists(): JSX.Element {
    const vocabulary = useVocabulary();
    const keys: RockitListKey[] = [
        "liked",
        "most-listened",
        "recent-mix",
        "latest-downloads",
        "year-recap",
        "last-month",
    ];
    return (
        <>
            {keys.map((key) => {
                const name = getRockitListName(key, vocabulary);
                return (
                    <NavigationPinMenu
                        key={key}
                        publicId={key}
                        title={name}
                        className="w-40 shrink-0"
                    >
                        <Link
                            href={`/playlist/${key}`}
                            className="focus-visible:outline-foreground-strong block w-40 rounded-lg focus-visible:outline-2"
                        >
                            <FeaturedArtwork
                                kind={key}
                                label={name}
                                size={160}
                            />
                            <p className="mt-2 truncate text-center font-semibold">
                                {name}
                            </p>
                            <p className="text-muted-foreground truncate text-center text-sm">
                                {vocabulary.BY} RockIt!
                            </p>
                        </Link>
                    </NavigationPinMenu>
                );
            })}
        </>
    );
}
