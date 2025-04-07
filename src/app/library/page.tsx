"use client";

import { FeaturedLists } from "@/components/Library/FeaturedLists";
import { LibraryFilters } from "@/components/Library/LibraryFilters";
import { LibraryLists } from "@/components/Library/LibraryLists";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";

export default function Library() {
    const $lang = useStore(langData);

    if (!$lang) return;
    return (
        <div className="md:px-8 w-full h-full pb-24 pt-24 overflow-y-auto">
            <section className="items-center justify-between flex px-10 md:px-0">
                <div className="hidden md:flex">
                    <label className="text-white text-4xl font-bold">
                        {$lang.library}
                    </label>
                </div>
                <LibraryFilters />
            </section>

            <FeaturedLists />
            <LibraryLists />
        </div>
    );
}
