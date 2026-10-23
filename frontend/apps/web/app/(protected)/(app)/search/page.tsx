import { JSX } from "react";
import Search from "@/components/Search/Search";

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string | string[] }>;
}): Promise<JSX.Element> {
    const { q } = await searchParams;
    const initialQuery = typeof q === "string" ? q.slice(0, 200) : undefined;
    return (
        <div className="relative flex h-full flex-col overflow-y-auto md:overflow-y-hidden">
            <Search initialQuery={initialQuery} />
        </div>
    );
}
