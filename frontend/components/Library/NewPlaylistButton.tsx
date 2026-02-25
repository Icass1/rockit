"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus } from "lucide-react";

export default function NewPlaylistButton() {
    const [showCreatePlaylistMenu, setShowCreatePlaylistMenu] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const { langFile: lang } = useLanguage();

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
                        width={600}
                        height={600}
                    />
                    <Plus className="cover absolute top-0 left-0 aspect-square h-auto w-full rounded-md p-6" />
                </div>
                <label className="min-h-6 truncate text-center font-semibold">
                    {lang?.newplaylist}
                </label>
            </div>
            {showCreatePlaylistMenu && (
                <div className="fixed top-0 right-0 bottom-0 left-0 z-90 bg-[#0b0b0b]">
                    <div className="relative top-1/2 left-1/2 flex h-fit w-1/2 -translate-x-1/2 -translate-y-1/2 flex-col gap-y-4">
                        <label className="font-semibold">
                            {lang?.newplaylistname}
                            {error && (
                                <span className="text-red-600"> - {error}</span>
                            )}
                        </label>

                        <input
                            className={`w-full border-b border-solid bg-transparent text-2xl font-bold outline-none ${
                                error ? "text-red-600" : "text-white"
                            }`}
                            value={name}
                            type="search"
                            onChange={(e) => {
                                setName(e.target.value);
                                setError("");
                            }}
                        />
                        <div className="mx-auto flex w-fit flex-row gap-x-5 py-5">
                            <button
                                className="rounded-md border border-gray-500 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-200 hover:text-white"
                                onClick={() => {
                                    setShowCreatePlaylistMenu(false);
                                }}
                            >
                                {lang?.cancel}
                            </button>
                            <button
                                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
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
                                {lang?.create}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
