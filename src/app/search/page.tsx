"use client";

import Search from "@/components/Search/Search";

export default function SearchPage() {
    return (
        <div className="relative flex h-full flex-col overflow-y-auto pt-24 md:h-[calc(100%_-_6rem)] md:overflow-y-hidden">
            <Search />
        </div>
    );
}
