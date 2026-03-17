import Search from "@/components/Search/Search";

export default function SearchPage() {
    return (
        <div className="relative flex h-full flex-col overflow-y-auto md:h-[calc(100%-6rem)] md:overflow-y-hidden">
            <Search />
        </div>
    );
}
