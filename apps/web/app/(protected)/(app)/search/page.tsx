import { JSX } from "react";
import Search from "@/components/Search/Search";

export default function SearchPage(): JSX.Element {
    return (
        <div className="relative flex h-full flex-col overflow-y-auto md:overflow-y-hidden">
            <Search />
        </div>
    );
}
