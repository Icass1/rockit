import { LayoutGrid, Text } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

export default function ToggleLayoutButton({
    libraryView,
    setLibraryView,
}: {
    libraryView: "grid" | "byArtist";
    setLibraryView: Dispatch<SetStateAction<"grid" | "byArtist" | undefined>>;
}) {
    let icon;

    if (libraryView === "grid") {
        icon = (
            <LayoutGrid className="relative top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
        );
    } else if (libraryView == "byArtist") {
        icon = (
            <Text className="relative top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2" />
        );
    }

    return (
        <div
            onClick={() => {
                if (libraryView === "grid") {
                    setLibraryView("byArtist");
                    fetch("/api/user/library-view", {
                        method: "POST",
                        body: JSON.stringify({ view: "byArtist" }),
                    });
                } else if (libraryView === "byArtist") {
                    setLibraryView("grid");
                    fetch("/api/user/library-view", {
                        method: "POST",
                        body: JSON.stringify({ view: "grid" }),
                    });
                }
            }}
            title="Toggle layout"
            className="h-8 w-8 cursor-pointer rounded-full bg-gradient-to-r from-[#ee1086] to-[#fb6467] shadow-[0px_0px_20px_3px_#0e0e0e] transition-transform md:h-16 md:w-16 md:hover:scale-105"
        >
            {icon}
        </div>
    );
}
