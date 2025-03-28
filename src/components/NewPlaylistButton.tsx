import { navigate } from "astro:transitions/client";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function NewPlaylistButton() {
    const [showCreatePlaylistMenu, setShowCreatePlaylistMenu] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    return (
        <>
            <div
                className="w-full h-full flex flex-col min-w-0 max-w-full md:hover:scale-110 transition-transform library-item"
                onClick={() => {
                    setShowCreatePlaylistMenu(true);
                }}
            >
                <div className="w-full h-auto cover aspect-square relative">
                    <img
                        className="absolute top-0 left-0 rounded-md w-full h-auto cover aspect-square"
                        src="/rockit-background.png"
                    />
                    <Plus strokeWidth={3} className="absolute top-0 left-0 rounded-md w-full h-auto cover aspect-square p-6" />
                </div>
                <label className="truncate font-semibold text-center min-h-6">
                    New playlist
                </label>
            </div>
            {showCreatePlaylistMenu && (
                <div className="fixed bg-gray-400 top-0 left-0 right-0 bottom-0">
                    <div className="flex flex-col gap-y-4 relative w-2/3 h-fit left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <label className="font-semibold">
                            New playlist name
                        </label>
                        {error && (
                            <label className="text-sm text-red-600">
                                {error}
                            </label>
                        )}
                        <input
                            className="bg-transparent border-b border-solid outline-none w-full text-2xl font-bold"
                            value={name}
                            type="search"
                            onChange={(e) => {
                                setName(e.target.value);
                            }}
                        />
                        <div className="w-fit gap-x-4 flex flex-row mx-auto">
                            <button
                                onClick={() => {
                                    setShowCreatePlaylistMenu(false);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="text-green-700"
                                onClick={() => {
                                    if (name == "") {
                                        setError(
                                            "Enter a name for your new playlist"
                                        );
                                        return;
                                    }
                                    fetch("/api/playlist/new", {
                                        method: "POST",
                                        body: JSON.stringify({ name: name }),
                                    })
                                        .then((response) => response.json())
                                        .catch(() => {
                                            setError(
                                                "Error creating your new playlist"
                                            );
                                            return Promise.reject();
                                        })
                                        .then((data) =>
                                            navigate(`/playlist/${data.id}`)
                                        )
                                        .catch((error) =>
                                            setError(error.toString())
                                        );
                                }}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
