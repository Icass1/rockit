import { Plus } from "lucide-react";
import { useState } from "react";
import Image from "@/components/Image";
import { useRouter } from "next/navigation";

export default function NewPlaylistButton() {
    const [showCreatePlaylistMenu, setShowCreatePlaylistMenu] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const router = useRouter();

    return (
        <>
            <div
                className="library-item flex h-full w-full max-w-full min-w-0 flex-col transition-transform md:hover:scale-110"
                onClick={() => {
                    setShowCreatePlaylistMenu(true);
                }}
            >
                <div className="cover relative aspect-square h-auto w-full">
                    <Image
                        alt=""
                        className="cover absolute top-0 left-0 aspect-square h-auto w-full rounded-md"
                        src="/rockit-background.png"
                    />
                    <Plus className="cover absolute top-0 left-0 aspect-square h-auto w-full rounded-md p-6" />
                </div>
                <label className="min-h-6 truncate text-center font-semibold">
                    New playlist
                </label>
            </div>
            {showCreatePlaylistMenu && (
                <div className="fixed top-0 right-0 bottom-0 left-0 bg-gray-400">
                    <div className="relative top-1/2 left-1/2 flex h-fit w-2/3 -translate-x-1/2 -translate-y-1/2 flex-col gap-y-4">
                        <label className="font-semibold">
                            New playlist name
                        </label>
                        {error && (
                            <label className="text-sm text-red-600">
                                {error}
                            </label>
                        )}
                        <input
                            className="w-full border-b border-solid bg-transparent text-2xl font-bold outline-none"
                            value={name}
                            type="search"
                            onChange={(e) => {
                                setName(e.target.value);
                            }}
                        />
                        <div className="mx-auto flex w-fit flex-row gap-x-4">
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
                                            router.push(`/playlist/${data.id}`)
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
