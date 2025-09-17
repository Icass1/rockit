import { LayoutGrid, Text } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

export default function ToggleLayoutButton({
    libraryView,
    setLibraryView,
}: {
    libraryView: "grid" | "byArtist";
    setLibraryView: Dispatch<SetStateAction<"grid" | "byArtist">>;
}) {
    let icon;

    if (libraryView === "grid") {
        icon = (
            <LayoutGrid className="relative top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        );
    } else {
        icon = (
            <Text className="relative top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
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
                } else {
                    setLibraryView("grid");
                    fetch("/api/user/library-view", {
                        method: "POST",
                        body: JSON.stringify({ view: "grid" }),
                    });
                }
            }}
            title="Toggle layout"
            className="hidden h-6 w-6 cursor-pointer transition-transform md:flex"
        >
            {icon}
        </div>
    );
}
