"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useDev from "@/hooks/useDev";
import { DownloadItem } from "@/types/rockIt";
import { EyeIcon } from "lucide-react";

export default function DownloadElement({
    download,
}: {
    download: DownloadItem;
}) {
    const [name, setName] = useState("");
    const [cover, setCover] = useState("");
    const [artistOwner, setArtistOwner] = useState("");

    const type = useMemo(() => {
        if (download.downloadURL.includes("open.spotify.com/album")) {
            return "Spotify Album";
        } else if (download.downloadURL.includes("open.spotify.com/playlist")) {
            return "Spotify Playlist";
        } else if (download.downloadURL.includes("open.spotify.com/track")) {
            return "Spotify Song";
        }
        return "";
    }, [download.downloadURL]);

    const [selected, setSelected] = useState(false);

    const dev = useDev();
    const router = useRouter();

    console.log("DownloadElement", { setSelected, router });

    useEffect(() => {
        if (download.downloadURL.includes("open.spotify.com/album")) {
            const albumId = download.downloadURL.replace(
                "https://open.spotify.com/album/",
                ""
            );

            fetch(`/api/album/${albumId}?p=name,image,artists`)
                .then((response) => response.json())
                .then((data) => {
                    setName(data.name);
                    setCover(data.image);
                    setArtistOwner(
                        data.artists.map(
                            (artist: { name: string }) => artist.name
                        )
                    );
                });

            console.log("Album", download.downloadURL);
        } else if (download.downloadURL.includes("open.spotify.com/playlist")) {
            const playlistId = download.downloadURL.replace(
                "https://open.spotify.com/playlist/",
                ""
            );

            fetch(`/api/playlist/${playlistId}?p=name,image,owner`)
                .then((response) => response.json())
                .then((data) => {
                    setName(data.name);
                    setCover(data.image);
                    setArtistOwner(data.owner);
                });

            console.log("Playlist", download.downloadURL);
        } else if (download.downloadURL.includes("open.spotify.com/track")) {
            const songId = download.downloadURL.replace(
                "https://open.spotify.com/track/",
                ""
            );

            fetch(`/api/song/${songId}?q=name,image,artists`)
                .then((response) => response.json())
                .then((data) => {
                    setName(data.name);
                    setCover(data.image);
                    setArtistOwner(
                        data.artists.map(
                            (artist: { name: string }) => artist.name
                        )
                    );
                });
        }
    }, [download.downloadURL]);

    // const handleMarkSeen = (e: MouseEvent) => {
    //     e.preventDefault();
    //     fetch(`/api/downloads/mark-seen/${download.publicId}`).then(
    //         (response) => {
    //             if (response.ok) {
    //                 router.push("/downloader");
    //             } else {
    //                 console.error("Error in mark as seen");
    //             }
    //         }
    //     );

    //     downloadInfo.set(
    //         Object.fromEntries(
    //             Object.entries(downloadInfo.get()).filter(
    //                 (entry) => entry[1].downloadId == download.publicId
    //             )
    //         )
    //     );
    // };

    // const handleClick = () => {
    //     if (selected) {
    //         setSelected(false);
    //         downloadInfo.set(
    //             Object.fromEntries(
    //                 Object.entries(downloadInfo.get()).map((entry) => {
    //                     if (entry[1].downloadId == download.publicId) {
    //                         entry[1].selected = false;
    //                         return entry;
    //                     } else {
    //                         return entry;
    //                     }
    //                 })
    //             )
    //         );
    //     } else {
    //         setSelected(true);
    //         downloadInfo.set(
    //             Object.fromEntries(
    //                 Object.entries(downloadInfo.get()).map((entry) => {
    //                     if (entry[1].downloadId == download.publicId) {
    //                         entry[1].selected = true;
    //                         return entry;
    //                     } else {
    //                         return entry;
    //                     }
    //                 })
    //             )
    //         );
    //     }
    // };

    let link = "";
    if (download.downloadURL.includes("https://open.spotify.com")) {
        link = download.downloadURL
            .replace("https://open.spotify.com", "")
            .replace("track", "song");
    } else {
        console.warn(
            "DownloadElement: Unsupported download URL format",
            download.downloadURL
        );
    }

    return (
        <Link href={link}>
            <div
                onClick={() => {
                    console.log("DownloadElement handleClick");
                }}
                className={
                    "grid cursor-pointer grid-cols-[2.5rem_1fr_2rem] grid-rows-[min-content_1.5rem_1rem_1fr_min-content] items-center rounded bg-neutral-700 p-2 transition-colors hover:bg-neutral-800" +
                    (selected ? " bg-green-700" : "")
                }
                style={{
                    gridTemplateAreas: `
                    "download-element-type          download-element-type          download-element-type"
                    "download-element-cover         download-element-name          download-element-mark-as-seen"
                    "download-element-cover         download-element-artist-owner  download-element-mark-as-seen"
                    "download-element-download-url  download-element-download-url  download-element-download-url"
                    "download-element-dev-data      download-element-dev-data      download-element-dev-data"
                    `,
                }}
            >
                <div
                    style={{ gridArea: "download-element-cover" }}
                    className={
                        "h-full max-h-full min-h-0 w-full max-w-full min-w-0" +
                        (cover ? "" : " skeleton")
                    }
                >
                    {cover && (
                        <Image
                            src={cover}
                            alt="cover"
                            className="relative h-full w-full rounded"
                        />
                    )}
                </div>
                <label
                    style={{ gridArea: "download-element-type" }}
                    className={
                        "px-1 pb-1 text-xs" +
                        (type ? "" : " skeleton mx-1 mb-1 min-h-4 w-1/3")
                    }
                >
                    {type}
                </label>
                <label
                    style={{
                        gridArea: "download-element-name",
                    }}
                    className={
                        "px-1" +
                        (name
                            ? ""
                            : " skeleton mx-1 h-4/5 max-h-full min-h-0 w-1/2")
                    }
                >
                    {name}
                </label>
                <label
                    style={{ gridArea: "download-element-artist-owner" }}
                    className={
                        "px-1 text-sm " +
                        (artistOwner
                            ? ""
                            : " skeleton mx-1 h-4/5 max-h-full min-h-0 w-1/3")
                    }
                >
                    {artistOwner}
                </label>
                <div
                    style={{ gridArea: "download-element-mark-as-seen" }}
                    className="relative h-full max-h-full min-h-0 w-full max-w-full min-w-0"
                    title="Mark as seen"
                    onClick={() => {
                        console.log("DownloadElement markSeen");
                    }}
                >
                    <EyeIcon className="absolute top-1/2 left-1/2 h-6 w-6 -translate-1/2"></EyeIcon>
                </div>
                <label
                    style={{ gridArea: "download-element-download-url" }}
                    className="text-xs"
                >
                    {download.downloadURL}
                </label>
                {dev && (
                    <div
                        className="w-full max-w-full min-w-0 text-yellow-500"
                        style={{ gridArea: "download-element-dev-data" }}
                    >
                        <label>[DEV]</label>
                        <div className="grid grid-cols-[1fr_2fr] gap-x-2">
                            <label className="text-right">id</label>
                            <label className="w-full max-w-full min-w-0 truncate">
                                {download.publicId}
                            </label>
                            <label className="text-right">userId</label>
                            <label className="w-full max-w-full min-w-0 truncate">
                                {download.userId}
                            </label>
                            <label className="text-right">dateStarted</label>
                            <label className="w-full max-w-full min-w-0 truncate">
                                {download.dateStarted.toDateString()}
                            </label>
                            <label className="text-right">dateEnded</label>
                            <label className="w-full max-w-full min-w-0 truncate">
                                {download.dateEnded.toDateString()}
                            </label>
                            <label className="text-right">status</label>
                            <label className="w-full max-w-full min-w-0 truncate">
                                {download.status}
                            </label>
                            <label className="text-right">fail</label>
                            <label className="w-full max-w-full min-w-0 truncate">
                                {download.fail}
                            </label>
                            <label className="text-right">success</label>
                            <label className="w-full max-w-full min-w-0 truncate">
                                {download.success}
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </Link>
    );
}
